from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path

from kivy.app import App
from kivy.metrics import dp
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.label import Label
from kivy.uix.popup import Popup
from kivy.uix.scrollview import ScrollView
from kivy.uix.spinner import Spinner
from kivy.uix.textinput import TextInput

from cash_control import (
    DEMO_USERS,
    MOVEMENT_CATEGORIES,
    ROLE_LABELS,
    CashStore,
    format_amount,
    format_signed_amount,
    parse_amount,
    session_totals,
)


class CashControlApp(App):
    title = "Control de Caja"

    def build(self) -> BoxLayout:
        database_path = Path(self.user_data_dir) / "cash-control.db"
        self.store = CashStore(database_path)
        self.notice = ""
        self.content = BoxLayout(orientation="vertical", spacing=dp(8), padding=dp(16))
        self.render()
        return self.content

    def _label(self, text: str, *, size: int = 16, height: int = 36, color: str = "#14213D") -> Label:
        return Label(
            text=text,
            color=color,
            font_size=dp(size),
            size_hint_y=None,
            height=dp(height),
            halign="left",
            valign="middle",
            text_size=(None, dp(height)),
        )

    def _button(self, text: str, callback, *, height: int = 48) -> Button:
        button = Button(
            text=text,
            size_hint_y=None,
            height=dp(height),
            background_normal="",
            background_color=(0.16, 0.33, 0.85, 1),
            color=(1, 1, 1, 1),
        )
        button.bind(on_release=lambda _button: callback())
        return button

    def _input(self, hint: str, *, text: str = "", height: int = 48) -> TextInput:
        return TextInput(
            text=text,
            hint_text=hint,
            multiline=False,
            size_hint_y=None,
            height=dp(height),
            padding=(dp(12), dp(12)),
            input_filter=None,
        )

    def _show_error(self, message: str) -> None:
        popup_content = BoxLayout(orientation="vertical", spacing=dp(12), padding=dp(16))
        popup_content.add_widget(self._label(message, height=80))
        popup = Popup(
            title="No se pudo completar la acción",
            content=popup_content,
            size_hint=(0.9, None),
            height=dp(190),
        )
        popup_content.add_widget(self._button("Entendido", popup.dismiss, height=42))
        popup.open()

    def _perform(self, callback, success_message: str = "") -> None:
        try:
            callback()
            self.notice = success_message
        except (ValueError, PermissionError, RuntimeError, sqlite3.Error, OSError) as error:
            self._show_error(str(error))
            return
        self.render()

    def _workspace(self, user):
        if user.role == "accountant":
            session = self.store.latest_session()
        else:
            session = self.store.latest_session_for_user(user.id)
        movements = self.store.list_movements(session["id"]) if session else []
        return session, movements

    def _open_profile(self, user_id: str) -> None:
        def action() -> None:
            self.store.set_active_user_id(user_id)
            self.notice = ""

        self._perform(action)

    def _logout(self) -> None:
        def action() -> None:
            self.store.set_active_user_id(None)
            self.notice = ""

        self._perform(action)

    def _add_heading(self, layout: BoxLayout, text: str) -> None:
        layout.add_widget(self._label(text, size=22, height=42))

    def render(self) -> None:
        self.content.clear_widgets()
        self.content.add_widget(self._label("CONTROL DE CAJA  ·  LOCAL", size=18, height=42))
        if self.notice:
            self.content.add_widget(self._label(self.notice, color="#B54747", height=52))
        scroll = ScrollView(do_scroll_x=False)
        body = BoxLayout(
            orientation="vertical",
            spacing=dp(10),
            padding=(0, dp(4), 0, dp(20)),
            size_hint_y=None,
        )
        body.bind(minimum_height=body.setter("height"))
        user_id = self.store.active_user_id()
        user = next((candidate for candidate in DEMO_USERS if candidate.id == user_id), None)
        if user is None:
            self._render_login(body)
        else:
            self._render_workspace(body, user)
        scroll.add_widget(body)
        self.content.add_widget(scroll)

    def _render_login(self, body: BoxLayout) -> None:
        self._add_heading(body, "¿Quién está usando la caja?")
        body.add_widget(
            self._label(
                "Elige un perfil de demostración. Los datos se guardan en SQLite en este dispositivo.",
                height=60,
            )
        )
        for user in DEMO_USERS:
            body.add_widget(
                self._button(
                    ROLE_LABELS[user.role],
                    lambda selected_id=user.id: self._open_profile(selected_id),
                )
            )
        body.add_widget(
            self._label("Prototipo: perfiles locales sin contraseña ni autenticación real.", size=13, height=52)
        )

    def _render_workspace(self, body: BoxLayout, user) -> None:
        session, movements = self._workspace(user)
        can_operate = user.role != "accountant"
        body.add_widget(self._label(f"Perfil: {ROLE_LABELS[user.role]}", size=17))
        body.add_widget(self._button("Salir", self._logout, height=40))

        if session is None or session["status"] == "closed":
            self._render_open_session(body, user, session, can_operate)
            if session and session["status"] == "closed":
                self._render_closed_session(body, session)
                self._render_history(body, movements)
            return

        self._render_open_balance(body, session, movements)
        if can_operate:
            self._render_movement_form(body, user, session)
            self._render_close_form(body, session)
        self._render_history(body, movements)

    def _render_open_session(self, body: BoxLayout, user, previous_session, can_operate: bool) -> None:
        self._add_heading(body, "Abre tu caja" if can_operate else "No hay una caja abierta")
        if not can_operate:
            body.add_widget(self._label("Tu perfil es de solo lectura.", height=48))
            return
        if previous_session:
            body.add_widget(self._label("Registra el saldo inicial para iniciar otra sesión."))
        opening_input = self._input("Saldo inicial (por ejemplo, 150,00)")

        def open_session() -> None:
            amount = parse_amount(opening_input.text)
            if amount is None:
                raise ValueError("Ingresa un saldo inicial válido con hasta dos decimales.")
            self.store.open_session(user.id, amount)

        body.add_widget(opening_input)
        body.add_widget(self._button("Abrir sesión de caja", lambda: self._perform(open_session)))

    def _render_open_balance(self, body: BoxLayout, session: dict, movements: list[dict]) -> None:
        income, expense = session_totals(movements)
        expected = session["opening_balance_minor"] + income - expense
        self._add_heading(body, f"Saldo esperado: {format_amount(expected)}")
        body.add_widget(self._label("SESIÓN ABIERTA", color="#16805D"))
        body.add_widget(self._label(f"Saldo inicial: {format_amount(session['opening_balance_minor'])}"))
        body.add_widget(self._label(f"Ingresos: + {format_amount(income)}"))
        body.add_widget(self._label(f"Egresos: − {format_amount(expense)}"))
        body.add_widget(
            self._label(
                f"Iniciada: {self._format_datetime(session['opened_at'])}",
                size=13,
                height=28,
                color="#68758A",
            )
        )

    def _render_movement_form(self, body: BoxLayout, user, session: dict) -> None:
        self._add_heading(body, "Registrar movimiento")
        direction_spinner = Spinner(
            text="Ingreso",
            values=("Ingreso", "Egreso"),
            size_hint_y=None,
            height=dp(48),
        )
        category_spinner = Spinner(
            text=MOVEMENT_CATEGORIES["income"][0],
            values=MOVEMENT_CATEGORIES["income"],
            size_hint_y=None,
            height=dp(48),
        )

        def update_categories(_spinner, selected: str) -> None:
            direction = "income" if selected == "Ingreso" else "expense"
            categories = MOVEMENT_CATEGORIES[direction]
            if user.role == "cashier" and direction == "expense":
                categories = tuple(item for item in categories if item != "Pago de salario")
            category_spinner.values = categories
            if category_spinner.text not in categories:
                category_spinner.text = categories[0]

        direction_spinner.bind(text=update_categories)
        amount_input = self._input("Monto (por ejemplo, 25,50)")
        note_input = self._input("Descripción o referencia (opcional)")

        def limit_note_length(text_input: TextInput, value: str) -> None:
            if len(value) > 160:
                cursor = text_input.cursor
                text_input.text = value[:160]
                text_input.cursor = min(cursor, 160)

        note_input.bind(text=limit_note_length)

        def save_movement() -> None:
            direction = "income" if direction_spinner.text == "Ingreso" else "expense"
            amount = parse_amount(amount_input.text)
            if amount is None or amount <= 0:
                raise ValueError("Ingresa un monto válido mayor que cero.")
            self.store.create_movement(
                user.id,
                session["id"],
                direction,
                category_spinner.text,
                amount,
                note_input.text,
            )

        body.add_widget(direction_spinner)
        body.add_widget(category_spinner)
        body.add_widget(amount_input)
        body.add_widget(note_input)
        body.add_widget(self._button("Guardar movimiento", lambda: self._perform(save_movement)))
        body.add_widget(
            self._label("Guardado localmente · pendiente de sincronización", size=13, height=28)
        )

    def _render_close_form(self, body: BoxLayout, session: dict) -> None:
        self._add_heading(body, "Conteo y cierre")
        counted_input = self._input("Efectivo contado")
        variance_input = self._input("Explicación si hay diferencia")

        def request_close() -> None:
            try:
                counted = parse_amount(counted_input.text)
                if counted is None:
                    raise ValueError("Ingresa el total de efectivo contado.")
                movements = self.store.list_movements(session["id"])
                income, expense = session_totals(movements)
                expected = session["opening_balance_minor"] + income - expense
                if counted != expected and len(variance_input.text.strip()) < 3:
                    raise ValueError("Explica la diferencia de caja antes de confirmar el cierre.")
                self._confirm_close(session, counted, variance_input.text)
            except ValueError as error:
                self._show_error(str(error))

        body.add_widget(counted_input)
        body.add_widget(variance_input)
        body.add_widget(self._button("Revisar y cerrar sesión", request_close))

    def _confirm_close(self, session: dict, counted: int, note: str) -> None:
        dialog_content = BoxLayout(orientation="vertical", spacing=dp(12), padding=dp(16))
        dialog_content.add_widget(
            self._label(
                f"¿Confirmas el cierre? Efectivo contado: {format_amount(counted)}",
                height=64,
            )
        )
        buttons = BoxLayout(size_hint_y=None, height=dp(48), spacing=dp(8))
        popup = Popup(
            title="Confirmar cierre",
            content=dialog_content,
            size_hint=(0.9, None),
            height=dp(210),
            auto_dismiss=False,
        )
        cancel = Button(text="Cancelar")
        confirm = Button(text="Confirmar", background_normal="", background_color=(0.16, 0.33, 0.85, 1))
        cancel.bind(on_release=popup.dismiss)

        def close() -> None:
            popup.dismiss()
            self._perform(
                lambda: self.store.close_session(
                    self.store.active_user_id() or "",
                    session["id"],
                    counted,
                    note,
                ),
                "Sesión cerrada y guardada en este dispositivo.",
            )

        confirm.bind(on_release=lambda _button: close())
        buttons.add_widget(cancel)
        buttons.add_widget(confirm)
        dialog_content.add_widget(buttons)
        popup.open()

    def _render_closed_session(self, body: BoxLayout, session: dict) -> None:
        self._add_heading(body, "Sesión cerrada")
        body.add_widget(self._label(f"Saldo esperado: {format_amount(session['expected_balance_minor'])}"))
        body.add_widget(self._label(f"Efectivo contado: {format_amount(session['counted_balance_minor'])}"))
        body.add_widget(
            self._label(f"Diferencia: {format_signed_amount(session['variance_minor'])}")
        )
        if session["variance_note"]:
            body.add_widget(self._label(f"Nota: {session['variance_note']}", height=52))
        body.add_widget(
            self._label(f"Cerrada: {self._format_datetime(session['closed_at'])}", size=13, height=28)
        )

    def _render_history(self, body: BoxLayout, movements: list[dict]) -> None:
        self._add_heading(body, "Movimientos")
        if not movements:
            body.add_widget(self._label("Todavía no hay movimientos registrados.", height=42))
            return
        for movement in movements:
            sign = "+" if movement["direction"] == "income" else "−"
            body.add_widget(
                self._label(
                    f"{sign} {format_amount(movement['amount_minor'])} · {movement['category']}",
                    height=32,
                )
            )
            if movement["note"]:
                body.add_widget(self._label(movement["note"], size=13, height=28, color="#68758A"))
            body.add_widget(
                self._label("Pendiente de sincronización", size=12, height=24, color="#8B5A00")
            )

    @staticmethod
    def _format_datetime(value: str | None) -> str:
        if not value:
            return ""
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError:
            return value
        return parsed.astimezone().strftime("%d/%m/%Y %H:%M")


if __name__ == "__main__":
    CashControlApp().run()
