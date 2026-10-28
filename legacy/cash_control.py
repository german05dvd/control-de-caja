from __future__ import annotations

import re
import sqlite3
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Iterator, Literal


Role = Literal["cashier", "supervisor", "accountant"]
Direction = Literal["income", "expense"]
MAX_SAFE_MINOR_UNITS = 9_007_199_254_740_991

MOVEMENT_CATEGORIES: dict[Direction, tuple[str, ...]] = {
    "income": ("Venta", "Cobro", "Otro ingreso"),
    "expense": ("Reembolso", "Gasto operativo", "Pago de salario", "Otro egreso"),
}


@dataclass(frozen=True)
class DemoUser:
    id: str
    name: str
    role: Role


DEMO_USERS = (
    DemoUser("user-cashier-ana", "Vendedor", "cashier"),
    DemoUser("user-supervisor-luis", "Supervisor", "supervisor"),
    DemoUser("user-accountant-camila", "Contabilidad", "accountant"),
)
USERS_BY_ID = {user.id: user for user in DEMO_USERS}
ROLE_LABELS = {
    "cashier": "Vendedor",
    "supervisor": "Supervisor",
    "accountant": "Contabilidad · solo lectura",
}


def parse_amount(value: str) -> int | None:
    """Parse a non-negative amount with up to two decimals into minor units."""
    normalized = value.strip().replace(",", ".")
    if not re.fullmatch(r"\d+(?:\.\d{1,2})?", normalized):
        return None
    try:
        amount = Decimal(normalized)
    except InvalidOperation:
        return None
    minor_units = int(amount * 100)
    return minor_units if 0 <= minor_units <= MAX_SAFE_MINOR_UNITS else None


def format_amount(minor_units: int) -> str:
    sign = "-" if minor_units < 0 else ""
    whole, cents = divmod(abs(minor_units), 100)
    grouped_whole = f"{whole:,}".replace(",", ".")
    return f"{sign}{grouped_whole},{cents:02d}"


def format_signed_amount(minor_units: int) -> str:
    if minor_units == 0:
        return format_amount(0)
    sign = "+" if minor_units > 0 else "−"
    return f"{sign} {format_amount(abs(minor_units))}"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class CashStore:
    """Offline-first SQLite storage and business rules for the demo app."""

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = str(database_path)
        if self.database_path != ":memory:":
            Path(self.database_path).parent.mkdir(parents=True, exist_ok=True)
        self.initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    @contextmanager
    def _connection(self) -> Iterator[sqlite3.Connection]:
        connection = self._connect()
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def initialize(self) -> None:
        with self._connection() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS app_state (
                    key TEXT PRIMARY KEY NOT NULL,
                    value TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS demo_users (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('cashier', 'supervisor', 'accountant'))
                );
                CREATE TABLE IF NOT EXISTS cash_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL REFERENCES demo_users(id),
                    opened_at TEXT NOT NULL,
                    opening_balance_minor INTEGER NOT NULL CHECK (opening_balance_minor >= 0),
                    status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
                    closed_at TEXT,
                    counted_balance_minor INTEGER CHECK (counted_balance_minor >= 0),
                    expected_balance_minor INTEGER,
                    variance_minor INTEGER,
                    variance_note TEXT,
                    closed_by_user_id TEXT,
                    CHECK (
                        status = 'open' OR
                        (closed_at IS NOT NULL AND counted_balance_minor IS NOT NULL
                         AND expected_balance_minor IS NOT NULL AND variance_minor IS NOT NULL
                         AND closed_by_user_id IS NOT NULL)
                    )
                );
                CREATE UNIQUE INDEX IF NOT EXISTS one_open_session_per_user
                    ON cash_sessions(user_id) WHERE status = 'open';
                CREATE TABLE IF NOT EXISTS cash_movements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id TEXT NOT NULL UNIQUE,
                    session_id INTEGER NOT NULL REFERENCES cash_sessions(id),
                    user_id TEXT NOT NULL REFERENCES demo_users(id),
                    direction TEXT NOT NULL CHECK (direction IN ('income', 'expense')),
                    category TEXT NOT NULL,
                    amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
                    note TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL,
                    sync_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (sync_status IN ('pending', 'synced', 'error'))
                );
                """
            )
            connection.executemany(
                "INSERT OR IGNORE INTO demo_users (id, name, role) VALUES (?, ?, ?)",
                ((user.id, user.name, user.role) for user in DEMO_USERS),
            )
            connection.executemany(
                "UPDATE demo_users SET name = ?, role = ? WHERE id = ?",
                ((user.name, user.role, user.id) for user in DEMO_USERS),
            )

    @staticmethod
    def _user(user_id: str) -> DemoUser:
        user = USERS_BY_ID.get(user_id)
        if user is None:
            raise ValueError("El usuario seleccionado no está registrado en este dispositivo.")
        return user

    @staticmethod
    def _session(row: sqlite3.Row | None) -> dict | None:
        return dict(row) if row else None

    @staticmethod
    def _movement(row: sqlite3.Row) -> dict:
        return dict(row)

    def active_user_id(self) -> str | None:
        with self._connection() as connection:
            row = connection.execute(
                "SELECT value FROM app_state WHERE key = 'active-user'"
            ).fetchone()
        if row is None:
            return None
        return row["value"] if row["value"] in USERS_BY_ID else None

    def set_active_user_id(self, user_id: str | None) -> None:
        if user_id is not None:
            self._user(user_id)
        with self._connection() as connection:
            if user_id is None:
                connection.execute("DELETE FROM app_state WHERE key = 'active-user'")
            else:
                connection.execute(
                    "INSERT OR REPLACE INTO app_state (key, value) VALUES ('active-user', ?)",
                    (user_id,),
                )

    def latest_session_for_user(self, user_id: str) -> dict | None:
        with self._connection() as connection:
            row = connection.execute(
                "SELECT * FROM cash_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 1",
                (user_id,),
            ).fetchone()
        return self._session(row)

    def latest_session(self) -> dict | None:
        with self._connection() as connection:
            row = connection.execute(
                """SELECT * FROM cash_sessions
                   ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, id DESC LIMIT 1"""
            ).fetchone()
        return self._session(row)

    def list_movements(self, session_id: int) -> list[dict]:
        with self._connection() as connection:
            rows = connection.execute(
                "SELECT * FROM cash_movements WHERE session_id = ? ORDER BY id DESC",
                (session_id,),
            ).fetchall()
        return [self._movement(row) for row in rows]

    def open_session(self, user_id: str, opening_balance_minor: int) -> dict:
        user = self._user(user_id)
        if user.role == "accountant":
            raise PermissionError("El perfil de contabilidad no puede abrir una caja.")
        if (
            not isinstance(opening_balance_minor, int)
            or opening_balance_minor < 0
            or opening_balance_minor > MAX_SAFE_MINOR_UNITS
        ):
            raise ValueError("El saldo inicial debe ser cero o un monto positivo válido.")
        with self._connection() as connection:
            existing = connection.execute(
                "SELECT 1 FROM cash_sessions WHERE user_id = ? AND status = 'open'",
                (user_id,),
            ).fetchone()
            if existing:
                raise ValueError("Este usuario ya tiene una sesión de caja abierta.")
            cursor = connection.execute(
                """INSERT INTO cash_sessions
                   (user_id, opened_at, opening_balance_minor, status)
                   VALUES (?, ?, ?, 'open')""",
                (user_id, _now(), opening_balance_minor),
            )
            row = connection.execute(
                "SELECT * FROM cash_sessions WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
        if row is None:
            raise RuntimeError("No se pudo recuperar la sesión de caja recién creada.")
        return dict(row)

    def create_movement(
        self,
        user_id: str,
        session_id: int,
        direction: Direction,
        category: str,
        amount_minor: int,
        note: str = "",
    ) -> None:
        user = self._user(user_id)
        if user.role == "accountant":
            raise PermissionError("El perfil de contabilidad tiene acceso de solo lectura.")
        if direction not in MOVEMENT_CATEGORIES:
            raise ValueError("Selecciona un tipo de movimiento válido.")
        if (
            not isinstance(amount_minor, int)
            or amount_minor <= 0
            or amount_minor > MAX_SAFE_MINOR_UNITS
        ):
            raise ValueError("El movimiento debe tener un monto mayor que cero.")
        if category not in MOVEMENT_CATEGORIES[direction]:
            raise ValueError("La categoría no corresponde al tipo de movimiento.")
        if user.role == "cashier" and category == "Pago de salario":
            raise PermissionError("Solo el perfil de supervisión puede registrar pagos de salario.")
        with self._connection() as connection:
            session = connection.execute(
                "SELECT user_id, status FROM cash_sessions WHERE id = ?", (session_id,)
            ).fetchone()
            if session is None or session["status"] != "open":
                raise ValueError("La sesión ya no está abierta. Actualiza la pantalla.")
            if session["user_id"] != user_id:
                raise PermissionError(
                    "No tienes permiso para registrar movimientos en esta sesión de caja."
                )
            connection.execute(
                """INSERT INTO cash_movements
                   (client_id, session_id, user_id, direction, category, amount_minor,
                    note, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    str(uuid.uuid4()),
                    session_id,
                    user_id,
                    direction,
                    category,
                    amount_minor,
                    note.strip(),
                    _now(),
                ),
            )

    def close_session(
        self, user_id: str, session_id: int, counted_balance_minor: int, variance_note: str
    ) -> dict:
        user = self._user(user_id)
        if user.role == "accountant":
            raise PermissionError("El perfil de contabilidad no puede cerrar una caja.")
        if (
            not isinstance(counted_balance_minor, int)
            or counted_balance_minor < 0
            or counted_balance_minor > MAX_SAFE_MINOR_UNITS
        ):
            raise ValueError("El efectivo contado debe ser cero o un monto positivo válido.")
        with self._connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            session = connection.execute(
                "SELECT * FROM cash_sessions WHERE id = ?", (session_id,)
            ).fetchone()
            if session is None or session["status"] != "open":
                raise ValueError("La sesión ya está cerrada o no existe.")
            if session["user_id"] != user_id:
                raise PermissionError("Solo puedes cerrar tu propia sesión de caja.")
            totals = connection.execute(
                """SELECT
                    COALESCE(SUM(CASE WHEN direction = 'income' THEN amount_minor ELSE 0 END), 0)
                        AS income,
                    COALESCE(SUM(CASE WHEN direction = 'expense' THEN amount_minor ELSE 0 END), 0)
                        AS expense
                   FROM cash_movements WHERE session_id = ?""",
                (session_id,),
            ).fetchone()
            expected = session["opening_balance_minor"] + totals["income"] - totals["expense"]
            variance = counted_balance_minor - expected
            note = variance_note.strip() if variance else ""
            if variance and len(note) < 3:
                raise ValueError("Explica la diferencia de caja antes de confirmar el cierre.")
            connection.execute(
                """UPDATE cash_sessions SET status = 'closed', closed_at = ?,
                   counted_balance_minor = ?, expected_balance_minor = ?, variance_minor = ?,
                   variance_note = ?, closed_by_user_id = ? WHERE id = ? AND status = 'open'""",
                (
                    _now(),
                    counted_balance_minor,
                    expected,
                    variance,
                    note or None,
                    user_id,
                    session_id,
                ),
            )
            row = connection.execute(
                "SELECT * FROM cash_sessions WHERE id = ?", (session_id,)
            ).fetchone()
        if row is None:
            raise RuntimeError("No se pudo recuperar el cierre de caja.")
        return dict(row)


def session_totals(movements: list[dict]) -> tuple[int, int]:
    income = sum(item["amount_minor"] for item in movements if item["direction"] == "income")
    expense = sum(item["amount_minor"] for item in movements if item["direction"] == "expense")
    return income, expense
