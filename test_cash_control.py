import sqlite3
import tempfile
import unittest
from pathlib import Path

from cash_control import (
    DEMO_USERS,
    ROLE_LABELS,
    CashStore,
    format_amount,
    parse_amount,
)


class CashControlTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.store = CashStore(Path(self.temporary_directory.name) / "test.db")

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def test_amount_parsing_uses_integer_minor_units(self) -> None:
        self.assertEqual(parse_amount("125,50"), 12550)
        self.assertEqual(parse_amount("0"), 0)
        self.assertIsNone(parse_amount("1.234"))
        self.assertIsNone(parse_amount("-2"))
        self.assertEqual(format_amount(12550), "125,50")

    def test_movement_and_closure_calculate_balance(self) -> None:
        session = self.store.open_session("user-cashier-ana", 10000)
        self.store.create_movement(
            "user-cashier-ana", session["id"], "income", "Venta", 2500, "Venta mostrador"
        )
        self.store.create_movement(
            "user-cashier-ana", session["id"], "expense", "Gasto operativo", 500, "Bolsas"
        )

        closed = self.store.close_session("user-cashier-ana", session["id"], 12000, "")

        self.assertEqual(closed["expected_balance_minor"], 12000)
        self.assertEqual(closed["variance_minor"], 0)
        self.assertEqual(len(self.store.list_movements(session["id"])), 2)

    def test_variance_requires_explanation(self) -> None:
        session = self.store.open_session("user-cashier-ana", 10000)
        with self.assertRaisesRegex(ValueError, "Explica la diferencia"):
            self.store.close_session("user-cashier-ana", session["id"], 9000, "no")

        closed = self.store.close_session(
            "user-cashier-ana", session["id"], 9000, "Falta efectivo"
        )
        self.assertEqual(closed["variance_minor"], -1000)

    def test_profiles_use_job_titles(self) -> None:
        self.assertEqual(
            [user.name for user in DEMO_USERS], ["Vendedor", "Supervisor", "Contabilidad"]
        )
        self.assertEqual(ROLE_LABELS["cashier"], "Vendedor")
        self.assertEqual(ROLE_LABELS["supervisor"], "Supervisor")
        connection = sqlite3.connect(self.store.database_path)
        try:
            connection.executemany(
                "UPDATE demo_users SET name = ? WHERE id = ?",
                (
                    ("Nombre anterior vendedor", DEMO_USERS[0].id),
                    ("Nombre anterior supervisor", DEMO_USERS[1].id),
                ),
            )
            connection.commit()
        finally:
            connection.close()
        CashStore(self.store.database_path)
        connection = sqlite3.connect(self.store.database_path)
        try:
            saved_names = connection.execute(
                "SELECT name FROM demo_users ORDER BY id"
            ).fetchall()
        finally:
            connection.close()
        self.assertEqual(
            {name for (name,) in saved_names}, {"Vendedor", "Supervisor", "Contabilidad"}
        )

    def test_cashier_cannot_pay_salary_but_supervisor_can(self) -> None:
        session = self.store.open_session("user-cashier-ana", 1000)
        with self.assertRaisesRegex(PermissionError, "supervisión"):
            self.store.create_movement(
                "user-cashier-ana",
                session["id"],
                "expense",
                "Pago de salario",
                100,
            )
        supervisor_session = self.store.open_session("user-supervisor-luis", 1000)
        self.store.create_movement(
            "user-supervisor-luis",
            supervisor_session["id"],
            "expense",
            "Pago de salario",
            100,
        )
        self.assertEqual(len(self.store.list_movements(supervisor_session["id"])), 1)

    def test_accountant_cannot_open_session(self) -> None:
        with self.assertRaisesRegex(PermissionError, "no puede abrir"):
            self.store.open_session("user-accountant-camila", 0)

    def test_only_owner_can_close_session(self) -> None:
        session = self.store.open_session("user-cashier-ana", 1000)
        with self.assertRaisesRegex(PermissionError, "Solo puedes cerrar"):
            self.store.close_session("user-supervisor-luis", session["id"], 1000, "")


if __name__ == "__main__":
    unittest.main()
