import { PythonFile } from "./types";

export const PYTHON_FILES: PythonFile[] = [
  {
    name: "main.py",
    description: "Interfaz gráfica completa para Windows desarrollada con CustomTkinter",
    path: "main.py",
    language: "python",
    content: `"""
=============================================================================
SISTEMA DE INVENTARIO Y PUNTO DE VENTA LOCAL CON CUSTOMTKINTER Y GEMINI AI
Diseñado para Windows 10/11 con SQLite y funcionamiento Híbrido Offline
=============================================================================
Requisitos:
    pip install customtkinter google-genai pillow reportlab python-dotenv
Ejecución:
    python main.py
"""

import os
import sys
import threading
from datetime import datetime
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import customtkinter as ctk
from PIL import Image, ImageTk
from dotenv import load_dotenv

# Cargar variables de entorno (como GEMINI_API_KEY)
load_dotenv()

# Módulos locales del sistema
from database import Database
from gemini_extractor import GeminiInvoiceExtractor
from ticket_printer import TicketPrinter

# Código Maestro para Desbloquear Licencia Fiscal SENIAT
MASTER_UNLOCK_CODE = "FISCAL-ADMIN-2552"

# Configuración visual de CustomTkinter
ctk.set_appearance_mode("Dark")  # "System", "Dark", "Light"
ctk.set_default_color_theme("blue")  # "blue", "green", "dark-blue"


class InventoryApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        # Configuración de la ventana principal
        self.title("Sistema de Inventario Local & POS | CustomTkinter + Gemini AI")
        self.geometry("1240x780")
        self.minsize(1050, 680)

        # Ícono oficial del programa (Windows / Linux / Mac)
        try:
            if os.path.exists("app_icon.ico"):
                self.iconbitmap("app_icon.ico")
            elif os.path.exists("app_icon.jpg"):
                _icon_img = ImageTk.PhotoImage(Image.open("app_icon.jpg"))
                self.wm_iconphoto(True, _icon_img)
        except Exception:
            pass

        # Inicializar base de datos SQLite
        self.db = Database("inventario.db")

        # Inicializar extractor de facturas con Gemini
        self.extractor = GeminiInvoiceExtractor()

        # Inicializar impresor de tickets
        self.printer = TicketPrinter()

        # Variables del Punto de Venta (Carrito)
        self.cart_items = []  # Lista de dicts: {'producto_id', 'nombre', 'precio', 'cantidad', 'subtotal'}
        self.selected_invoice_path = None
        self.extracted_invoice_data = None

        # Construir UI
        self.create_header()
        self.create_tabview()
        self.create_statusbar()

        # Cargar datos iniciales
        self.load_categories_into_filters()
        self.refresh_inventory_table()
        self.refresh_movements_table()

    # -------------------------------------------------------------------------
    # HEADER Y BARRA SUPERIOR
    # -------------------------------------------------------------------------
    def create_header(self):
        header_frame = ctk.CTkFrame(self, height=65, corner_radius=0, fg_color=("#2b2b2b", "#1a1a1a"))
        header_frame.pack(fill="x", side="top")

        # Título y logotipo
        title_label = ctk.CTkLabel(
            header_frame,
            text="📦 SISTEMA DE INVENTARIO & POS",
            font=ctk.CTkFont(family="Segoe UI", size=20, weight="bold")
        )
        title_label.pack(side="left", padx=20, pady=15)

        subtitle_label = ctk.CTkLabel(
            header_frame,
            text="SQLite Local + Gemini IA Híbrido",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color="gray70"
        )
        subtitle_label.pack(side="left", padx=5, pady=18)

        # Selector de tema Dark / Light
        self.theme_switch = ctk.CTkSwitch(
            header_frame,
            text="Modo Oscuro",
            command=self.toggle_theme,
            onvalue="Dark",
            offvalue="Light"
        )
        self.theme_switch.select()
        self.theme_switch.pack(side="right", padx=20, pady=15)

        # Indicador de estado de Gemini (Online / Offline Híbrido)
        is_online = self.extractor.is_configured()
        badge_text = "🟢 Gemini AI: Conectado" if is_online else "🟡 Modo Híbrido: 100% Local"
        badge_color = "#1b5e20" if is_online else "#e65100"

        self.status_badge = ctk.CTkLabel(
            header_frame,
            text=badge_text,
            fg_color=badge_color,
            text_color="white",
            corner_radius=8,
            padx=12,
            pady=4,
            font=ctk.CTkFont(family="Segoe UI", size=12, weight="bold")
        )
        self.status_badge.pack(side="right", padx=15, pady=15)

    def toggle_theme(self):
        mode = self.theme_switch.get()
        ctk.set_appearance_mode(mode)

    # -------------------------------------------------------------------------
    # TABVIEW PRINCIPAL (PESTAÑAS)
    # -------------------------------------------------------------------------
    def create_tabview(self):
        self.tabview = ctk.CTkTabview(self, corner_radius=12)
        self.tabview.pack(fill="both", expand=True, padx=15, pady=(10, 5))

        # 4 Pestañas según especificación
        self.tab_inventory = self.tabview.add("📦 Inventario")
        self.tab_pos = self.tabview.add("🛒 Punto de Venta (POS)")
        self.tab_movements = self.tabview.add("📋 Registro de Movimientos")
        self.tab_invoice_ai = self.tabview.add("🧾 Facturas con Gemini AI")

        # Construir cada pestaña
        self.build_inventory_tab()
        self.build_pos_tab()
        self.build_movements_tab()
        self.build_invoice_ai_tab()

    # -------------------------------------------------------------------------
    # PESTAÑA 1: INVENTARIO
    # -------------------------------------------------------------------------
    def build_inventory_tab(self):
        # Barra superior de filtros y acciones
        top_bar = ctk.CTkFrame(self.tab_inventory, fg_color="transparent")
        top_bar.pack(fill="x", padx=10, pady=10)

        # Campo de búsqueda
        self.inv_search_entry = ctk.CTkEntry(
            top_bar,
            placeholder_text="🔍 Buscar por nombre o código de barras...",
            width=320,
            height=38
        )
        self.inv_search_entry.pack(side="left", padx=(0, 10))
        self.inv_search_entry.bind("<KeyRelease>", lambda e: self.refresh_inventory_table())

        # Filtro de categoría
        self.inv_category_filter = ctk.CTkOptionMenu(
            top_bar,
            values=["Todas las Categorías"],
            width=200,
            height=38,
            command=lambda choice: self.refresh_inventory_table()
        )
        self.inv_category_filter.pack(side="left", padx=5)

        # Botón Nuevo Producto
        btn_new_prod = ctk.CTkButton(
            top_bar,
            text="+ Nuevo Producto",
            height=38,
            fg_color="#1f6aa5",
            hover_color="#144870",
            command=self.open_new_product_modal
        )
        btn_new_prod.pack(side="right", padx=5)

        # Botón Ajustar Stock
        btn_adj_stock = ctk.CTkButton(
            top_bar,
            text="⚡ Ajuste Rápido",
            height=38,
            fg_color="#2e7d32",
            hover_color="#1b5e20",
            command=self.open_quick_stock_modal
        )
        btn_adj_stock.pack(side="right", padx=5)

        # Botón Eliminar
        btn_del_prod = ctk.CTkButton(
            top_bar,
            text="🗑️ Eliminar",
            height=38,
            fg_color="#c62828",
            hover_color="#8e0000",
            command=self.delete_selected_product
        )
        btn_del_prod.pack(side="right", padx=5)

        # Contenedor para Treeview de Productos (Estilizado para CustomTkinter)
        table_frame = ctk.CTkFrame(self.tab_inventory, corner_radius=8)
        table_frame.pack(fill="both", expand=True, padx=10, pady=5)

        columns = ("id", "codigo", "nombre", "categoria", "stock", "minimo", "costo", "precio", "ganancia", "estado")
        self.inv_tree = ttk.Treeview(table_frame, columns=columns, show="headings", selectmode="browse")

        self.inv_tree.heading("id", text="ID")
        self.inv_tree.heading("codigo", text="Cód. Barras")
        self.inv_tree.heading("nombre", text="Descripción / Producto")
        self.inv_tree.heading("categoria", text="Categoría")
        self.inv_tree.heading("stock", text="Stock")
        self.inv_tree.heading("minimo", text="Mín.")
        self.inv_tree.heading("costo", text="Costo ($)")
        self.inv_tree.heading("precio", text="Venta ($)")
        self.inv_tree.heading("ganancia", text="Margen")
        self.inv_tree.heading("estado", text="Estado")

        self.inv_tree.column("id", width=45, anchor="center")
        self.inv_tree.column("codigo", width=120, anchor="center")
        self.inv_tree.column("nombre", width=280, anchor="w")
        self.inv_tree.column("categoria", width=130, anchor="center")
        self.inv_tree.column("stock", width=70, anchor="center")
        self.inv_tree.column("minimo", width=55, anchor="center")
        self.inv_tree.column("costo", width=85, anchor="e")
        self.inv_tree.column("precio", width=85, anchor="e")
        self.inv_tree.column("ganancia", width=75, anchor="center")
        self.inv_tree.column("estado", width=110, anchor="center")

        # Scrollbars
        y_scroll = ttk.Scrollbar(table_frame, orient="vertical", command=self.inv_tree.yview)
        self.inv_tree.configure(yscrollcommand=y_scroll.set)
        y_scroll.pack(side="right", fill="y")
        self.inv_tree.pack(fill="both", expand=True)

        self.inv_tree.bind("<Double-1>", lambda e: self.open_edit_product_modal())

        # Barra inferior de estadísticas
        self.inv_stats_frame = ctk.CTkFrame(self.tab_inventory, height=42, fg_color=("gray90", "#242424"))
        self.inv_stats_frame.pack(fill="x", padx=10, pady=(5, 10))

        self.lbl_stats = ctk.CTkLabel(
            self.inv_stats_frame,
            text="Cargando estadísticas...",
            font=ctk.CTkFont(family="Segoe UI", size=12)
        )
        self.lbl_stats.pack(side="left", padx=15, pady=8)

    def load_categories_into_filters(self):
        categories = self.db.get_categories()
        cat_names = ["Todas las Categorías"] + [c["nombre"] for c in categories]
        self.inv_category_filter.configure(values=cat_names)
        self.inv_category_filter.set("Todas las Categorías")

    def refresh_inventory_table(self):
        # Limpiar
        for row in self.inv_tree.get_children():
            self.inv_tree.delete(row)

        search_query = self.inv_search_entry.get().strip() if hasattr(self, "inv_search_entry") else ""
        selected_cat = self.inv_category_filter.get() if hasattr(self, "inv_category_filter") else "Todas las Categorías"

        cat_id = None
        if selected_cat != "Todas las Categorías":
            for cat in self.db.get_categories():
                if cat["nombre"] == selected_cat:
                    cat_id = cat["id"]
                    break

        products = self.db.get_products(search=search_query, category_id=cat_id)

        total_items = len(products)
        low_stock_count = 0
        total_value_cost = 0.0
        total_value_sale = 0.0

        for p in products:
            stock = p["stock_actual"]
            min_stock = p["stock_minimo"]
            cost = p["precio_costo"]
            price = p["precio_venta"]

            margin = 0
            if cost > 0:
                margin = round(((price - cost) / cost) * 100, 1)

            if stock <= 0:
                status = "🔴 AGOTADO"
                low_stock_count += 1
            elif stock <= min_stock:
                status = "🟡 STOCK BAJO"
                low_stock_count += 1
            else:
                status = "🟢 ÓPTIMO"

            total_value_cost += (stock * cost)
            total_value_sale += (stock * price)

            self.inv_tree.insert(
                "", "end",
                values=(
                    p["id"],
                    p["codigo_barras"] or "N/A",
                    p["nombre"],
                    p.get("categoria_nombre", "General"),
                    f"{stock:g}",
                    f"{min_stock:g}",
                    f"\${cost:,.2f}",
                    f"\${price:,.2f}",
                    f"{margin}%",
                    status
                )
            )

        if hasattr(self, "lbl_stats"):
            self.lbl_stats.configure(
                text=f"Total Productos: {total_items}  |  Alertas Stock Bajo: {low_stock_count}  |  "
                     f"Valuación Costo: \${total_value_cost:,.2f}  |  Valuación Venta: \${total_value_sale:,.2f}"
            )

    def open_new_product_modal(self):
        self.show_product_modal(title="Registrar Nuevo Producto")

    def open_edit_product_modal(self):
        selected = self.inv_tree.selection()
        if not selected:
            messagebox.showwarning("Aviso", "Seleccione un producto para editar.")
            return
        item_vals = self.inv_tree.item(selected[0])["values"]
        prod_id = item_vals[0]
        product = self.db.get_product_by_id(prod_id)
        if product:
            self.show_product_modal(title="Editar Producto", product=product)

    def show_product_modal(self, title, product=None):
        modal = ctk.CTkToplevel(self)
        modal.title(title)
        modal.geometry("480x560")
        modal.resizable(False, False)
        modal.grab_set()

        # Centrar sobre ventana padre
        x = self.winfo_x() + (self.winfo_width() // 2) - 240
        y = self.winfo_y() + (self.winfo_height() // 2) - 280
        modal.geometry(f"+{x}+{y}")

        ctk.CTkLabel(modal, text=title, font=ctk.CTkFont(size=18, weight="bold")).pack(pady=15)

        form_frame = ctk.CTkFrame(modal, fg_color="transparent")
        form_frame.pack(fill="both", expand=True, padx=30, pady=10)

        # Campos
        ctk.CTkLabel(form_frame, text="Código de Barras / SKU:").pack(anchor="w")
        ent_code = ctk.CTkEntry(form_frame, placeholder_text="Ej: 750100012345")
        ent_code.pack(fill="x", pady=(2, 8))

        ctk.CTkLabel(form_frame, text="Nombre del Producto:").pack(anchor="w")
        ent_name = ctk.CTkEntry(form_frame, placeholder_text="Ej: Arroz Grano Grueso 1kg")
        ent_name.pack(fill="x", pady=(2, 8))

        ctk.CTkLabel(form_frame, text="Categoría:").pack(anchor="w")
        categories = self.db.get_categories()
        cat_map = {c["nombre"]: c["id"] for c in categories}
        cat_names = list(cat_map.keys()) or ["General"]
        cmb_cat = ctk.CTkOptionMenu(form_frame, values=cat_names)
        cmb_cat.pack(fill="x", pady=(2, 8))

        row_prices = ctk.CTkFrame(form_frame, fg_color="transparent")
        row_prices.pack(fill="x", pady=4)

        col1 = ctk.CTkFrame(row_prices, fg_color="transparent")
        col1.pack(side="left", fill="x", expand=True, padx=(0, 5))
        ctk.CTkLabel(col1, text="Precio Costo ($):").pack(anchor="w")
        ent_cost = ctk.CTkEntry(col1, placeholder_text="0.00")
        ent_cost.pack(fill="x")

        col2 = ctk.CTkFrame(row_prices, fg_color="transparent")
        col2.pack(side="right", fill="x", expand=True, padx=(5, 0))
        ctk.CTkLabel(col2, text="Precio Venta ($):").pack(anchor="w")
        ent_price = ctk.CTkEntry(col2, placeholder_text="0.00")
        ent_price.pack(fill="x")

        row_stock = ctk.CTkFrame(form_frame, fg_color="transparent")
        row_stock.pack(fill="x", pady=6)

        col3 = ctk.CTkFrame(row_stock, fg_color="transparent")
        col3.pack(side="left", fill="x", expand=True, padx=(0, 5))
        ctk.CTkLabel(col3, text="Stock Inicial:").pack(anchor="w")
        ent_stock = ctk.CTkEntry(col3, placeholder_text="0")
        ent_stock.pack(fill="x")

        col4 = ctk.CTkFrame(row_stock, fg_color="transparent")
        col4.pack(side="right", fill="x", expand=True, padx=(5, 0))
        ctk.CTkLabel(col4, text="Stock Mínimo:").pack(anchor="w")
        ent_min = ctk.CTkEntry(col4, placeholder_text="5")
        ent_min.pack(fill="x")

        # Rellenar si es edición
        if product:
            ent_code.insert(0, product.get("codigo_barras") or "")
            ent_name.insert(0, product.get("nombre") or "")
            ent_cost.insert(0, str(product.get("precio_costo") or 0.0))
            ent_price.insert(0, str(product.get("precio_venta") or 0.0))
            ent_stock.insert(0, str(product.get("stock_actual") or 0))
            ent_min.insert(0, str(product.get("stock_minimo") or 5))

        def save():
            name = ent_name.get().strip()
            if not name:
                messagebox.showerror("Error", "El nombre del producto es obligatorio.")
                return

            try:
                cost = float(ent_cost.get().strip() or 0)
                price = float(ent_price.get().strip() or 0)
                stock = float(ent_stock.get().strip() or 0)
                min_s = float(ent_min.get().strip() or 5)
            except ValueError:
                messagebox.showerror("Error", "Los valores numéricos no son válidos.")
                return

            cat_id = cat_map.get(cmb_cat.get(), 1)
            code = ent_code.get().strip() or None

            if product:
                self.db.update_product(
                    prod_id=product["id"],
                    codigo_barras=code,
                    nombre=name,
                    categoria_id=cat_id,
                    stock_actual=stock,
                    stock_minimo=min_s,
                    precio_costo=cost,
                    precio_venta=price
                )
                messagebox.showinfo("Éxito", "Producto actualizado correctamente.")
            else:
                self.db.add_product(
                    codigo_barras=code,
                    nombre=name,
                    categoria_id=cat_id,
                    stock_actual=stock,
                    stock_minimo=min_s,
                    precio_costo=cost,
                    precio_venta=price
                )
                messagebox.showinfo("Éxito", "Producto registrado en el inventario.")

            modal.destroy()
            self.refresh_inventory_table()
            self.refresh_movements_table()

        btn_save = ctk.CTkButton(modal, text="Guardar Producto", height=42, command=save)
        btn_save.pack(pady=15, padx=30, fill="x")

    def delete_selected_product(self):
        selected = self.inv_tree.selection()
        if not selected:
            messagebox.showwarning("Aviso", "Seleccione un producto para eliminar.")
            return

        item_vals = self.inv_tree.item(selected[0])["values"]
        prod_id = item_vals[0]
        prod_name = item_vals[2]

        if messagebox.askyesno("Confirmar", f"¿Está seguro de eliminar '{prod_name}' del inventario?"):
            self.db.delete_product(prod_id)
            self.refresh_inventory_table()
            self.refresh_movements_table()

    def open_quick_stock_modal(self):
        selected = self.inv_tree.selection()
        if not selected:
            messagebox.showwarning("Aviso", "Seleccione un producto de la tabla.")
            return

        item_vals = self.inv_tree.item(selected[0])["values"]
        prod_id = item_vals[0]
        prod_name = item_vals[2]

        modal = ctk.CTkToplevel(self)
        modal.title("Ajuste de Stock Rápido")
        modal.geometry("380x300")
        modal.resizable(False, False)
        modal.grab_set()

        ctk.CTkLabel(modal, text="Ajustar Stock", font=ctk.CTkFont(size=16, weight="bold")).pack(pady=15)
        ctk.CTkLabel(modal, text=f"Producto: {prod_name}", wraplength=340).pack(pady=5)

        opt_tipo = ctk.CTkSegmentedButton(modal, values=["ENTRADA", "SALIDA", "AJUSTE"])
        opt_tipo.set("ENTRADA")
        opt_tipo.pack(pady=10, padx=20, fill="x")

        ent_cant = ctk.CTkEntry(modal, placeholder_text="Cantidad a modificar")
        ent_cant.pack(pady=5, padx=20, fill="x")

        ent_motivo = ctk.CTkEntry(modal, placeholder_text="Motivo (ej: Compra menor, Merma, Ajuste físico)")
        ent_motivo.pack(pady=5, padx=20, fill="x")

        def aplicar():
            try:
                cant = float(ent_cant.get().strip())
                if cant <= 0:
                    raise ValueError()
            except ValueError:
                messagebox.showerror("Error", "Ingrese una cantidad válida mayor a 0.")
                return

            tipo = opt_tipo.get()
            motivo = ent_motivo.get().strip() or f"Ajuste manual de {tipo.lower()}"

            self.db.record_movement(prod_id, tipo, cant, motivo)
            messagebox.showinfo("Éxito", f"Movimiento de {tipo} registrado correctamente.")
            modal.destroy()
            self.refresh_inventory_table()
            self.refresh_movements_table()

        ctk.CTkButton(modal, text="Aplicar Movimiento", height=38, command=aplicar).pack(pady=15, padx=20, fill="x")

    # -------------------------------------------------------------------------
    # PESTAÑA 2: PUNTO DE VENTA (POS)
    # -------------------------------------------------------------------------
    def build_pos_tab(self):
        # Contenedor dividido en 2 columnas: Izquierda (Búsqueda + Carrito), Derecha (Cobro y Ticket)
        pos_container = ctk.CTkFrame(self.tab_pos, fg_color="transparent")
        pos_container.pack(fill="both", expand=True, padx=10, pady=10)

        # Columna Izquierda: Búsqueda y Carrito
        left_col = ctk.CTkFrame(pos_container, corner_radius=10)
        left_col.pack(side="left", fill="both", expand=True, padx=(0, 10))

        search_bar = ctk.CTkFrame(left_col, fg_color="transparent")
        search_bar.pack(fill="x", padx=15, pady=15)

        ctk.CTkLabel(search_bar, text="🛒 Búsqueda rápida:", font=ctk.CTkFont(size=14, weight="bold")).pack(side="left", padx=(0, 10))

        self.pos_search_entry = ctk.CTkEntry(
            search_bar,
            placeholder_text="Escanear código de barras o escribir nombre y presionar ENTER...",
            height=40
        )
        self.pos_search_entry.pack(side="left", fill="x", expand=True, padx=(0, 10))
        self.pos_search_entry.bind("<Return>", lambda e: self.pos_search_and_add())

        btn_add = ctk.CTkButton(
            search_bar,
            text="+ Agregar",
            width=100,
            height=40,
            command=self.pos_search_and_add
        )
        btn_add.pack(side="right")

        # Tabla del carrito
        cart_table_frame = ctk.CTkFrame(left_col, fg_color="transparent")
        cart_table_frame.pack(fill="both", expand=True, padx=15, pady=(0, 15))

        columns = ("id", "nombre", "precio", "cantidad", "subtotal")
        self.pos_tree = ttk.Treeview(cart_table_frame, columns=columns, show="headings", selectmode="browse")

        self.pos_tree.heading("id", text="#")
        self.pos_tree.heading("nombre", text="Artículo")
        self.pos_tree.heading("precio", text="Precio Unit.")
        self.pos_tree.heading("cantidad", text="Cant.")
        self.pos_tree.heading("subtotal", text="Subtotal")

        self.pos_tree.column("id", width=40, anchor="center")
        self.pos_tree.column("nombre", width=320, anchor="w")
        self.pos_tree.column("precio", width=95, anchor="e")
        self.pos_tree.column("cantidad", width=75, anchor="center")
        self.pos_tree.column("subtotal", width=105, anchor="e")

        y_scroll_cart = ttk.Scrollbar(cart_table_frame, orient="vertical", command=self.pos_tree.yview)
        self.pos_tree.configure(yscrollcommand=y_scroll_cart.set)
        y_scroll_cart.pack(side="right", fill="y")
        self.pos_tree.pack(fill="both", expand=True)

        # Botones inferiores del carrito (+1, -1, Eliminar item, Limpiar)
        cart_actions = ctk.CTkFrame(left_col, height=45, fg_color="transparent")
        cart_actions.pack(fill="x", padx=15, pady=(0, 15))

        btn_qty_plus = ctk.CTkButton(cart_actions, text="➕ Cantidad +1", width=110, command=lambda: self.adjust_cart_qty(1))
        btn_qty_plus.pack(side="left", padx=(0, 5))

        btn_qty_minus = ctk.CTkButton(cart_actions, text="➖ Cantidad -1", width=110, command=lambda: self.adjust_cart_qty(-1))
        btn_qty_minus.pack(side="left", padx=5)

        btn_remove_item = ctk.CTkButton(cart_actions, text="🗑️ Quitar Item", fg_color="#c62828", hover_color="#8e0000", width=110, command=self.remove_from_cart)
        btn_remove_item.pack(side="left", padx=5)

        btn_clear_cart = ctk.CTkButton(cart_actions, text="Limpiar Carrito", fg_color="gray40", hover_color="gray30", width=110, command=self.clear_cart)
        btn_clear_cart.pack(side="right")

        # Columna Derecha: Panel de Cobro y Ticket
        right_col = ctk.CTkFrame(pos_container, width=360, corner_radius=10)
        right_col.pack(side="right", fill="y", padx=(0, 0))
        right_col.pack_propagate(False)

        ctk.CTkLabel(
            right_col,
            text="RESUMEN DE COBRO",
            font=ctk.CTkFont(family="Segoe UI", size=16, weight="bold")
        ).pack(pady=(20, 10))

        # Cuadro de Gran Total
        total_box = ctk.CTkFrame(right_col, corner_radius=10, fg_color=("#1976d2", "#0d47a1"))
        total_box.pack(fill="x", padx=20, pady=10)

        ctk.CTkLabel(total_box, text="TOTAL A PAGAR", font=ctk.CTkFont(size=12), text_color="white").pack(pady=(12, 0))
        self.lbl_pos_total = ctk.CTkLabel(
            total_box,
            text="$0.00",
            font=ctk.CTkFont(family="Segoe UI", size=34, weight="bold"),
            text_color="white"
        )
        self.lbl_pos_total.pack(pady=(0, 12))

        # Método de pago
        ctk.CTkLabel(right_col, text="Método de Pago:", font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=20, pady=(10, 2))
        self.cmb_payment_method = ctk.CTkOptionMenu(
            right_col,
            values=["Efectivo", "Tarjeta de Débito/Crédito", "Transferencia SPEI"],
            height=36
        )
        self.cmb_payment_method.pack(fill="x", padx=20, pady=(0, 10))

        # Monto Recibido
        ctk.CTkLabel(right_col, text="Monto Recibido ($):", font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=20, pady=(5, 2))
        self.ent_tendered = ctk.CTkEntry(right_col, placeholder_text="0.00", height=38, font=ctk.CTkFont(size=16))
        self.ent_tendered.pack(fill="x", padx=20, pady=(0, 10))
        self.ent_tendered.bind("<KeyRelease>", lambda e: self.calculate_change())

        # Cambio
        change_box = ctk.CTkFrame(right_col, fg_color=("gray85", "#222222"), corner_radius=8)
        change_box.pack(fill="x", padx=20, pady=5)
        ctk.CTkLabel(change_box, text="CAMBIO:", font=ctk.CTkFont(size=12, weight="bold")).pack(side="left", padx=15, pady=10)
        self.lbl_change = ctk.CTkLabel(change_box, text="$0.00", font=ctk.CTkFont(size=16, weight="bold"), text_color="#4caf50")
        self.lbl_change.pack(side="right", padx=15, pady=10)

        # Checkbox Imprimir Ticket
        self.chk_print_ticket = ctk.CTkCheckBox(right_col, text="Imprimir Ticket Térmico", font=ctk.CTkFont(size=13))
        self.chk_print_ticket.select()
        self.chk_print_ticket.pack(padx=20, pady=15, anchor="w")

        # Botón COBRAR E IMPRIMIR
        self.btn_checkout = ctk.CTkButton(
            right_col,
            text="💳 COBRAR E IMPRIMIR TICKET",
            height=50,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#2e7d32",
            hover_color="#1b5e20",
            command=self.execute_checkout
        )
        self.btn_checkout.pack(fill="x", padx=20, pady=(10, 15))

    def pos_search_and_add(self):
        query = self.pos_search_entry.get().strip()
        if not query:
            return

        product = self.db.find_product_by_barcode_or_name(query)
        if not product:
            messagebox.showerror("No encontrado", f"No se encontró ningún producto con el código o nombre: '{query}'")
            return

        if product["stock_actual"] <= 0:
            if not messagebox.askyesno("Stock Agotado", f"'{product['nombre']}' tiene stock 0. ¿Desea venderlo de todas formas?"):
                return

        # Verificar si ya está en el carrito
        found = False
        for item in self.cart_items:
            if item["producto_id"] == product["id"]:
                item["cantidad"] += 1
                item["subtotal"] = round(item["cantidad"] * item["precio"], 2)
                found = True
                break

        if not found:
            self.cart_items.append({
                "producto_id": product["id"],
                "nombre": product["nombre"],
                "precio": product["precio_venta"],
                "cantidad": 1,
                "subtotal": product["precio_venta"]
            })

        self.pos_search_entry.delete(0, "end")
        self.refresh_cart_view()

    def refresh_cart_view(self):
        for row in self.pos_tree.get_children():
            self.pos_tree.delete(row)

        total = 0.0
        for idx, item in enumerate(self.cart_items, start=1):
            total += item["subtotal"]
            self.pos_tree.insert(
                "", "end",
                values=(
                    idx,
                    item["nombre"],
                    f"\${item['precio']:,.2f}",
                    f"{item['cantidad']:g}",
                    f"\${item['subtotal']:,.2f}"
                )
            )

        self.lbl_pos_total.configure(text=f"\${total:,.2f}")
        self.calculate_change()

    def adjust_cart_qty(self, delta):
        selected = self.pos_tree.selection()
        if not selected:
            return
        idx = int(self.pos_tree.item(selected[0])["values"][0]) - 1
        if 0 <= idx < len(self.cart_items):
            self.cart_items[idx]["cantidad"] += delta
            if self.cart_items[idx]["cantidad"] <= 0:
                del self.cart_items[idx]
            else:
                self.cart_items[idx]["subtotal"] = round(
                    self.cart_items[idx]["cantidad"] * self.cart_items[idx]["precio"], 2
                )
            self.refresh_cart_view()

    def remove_from_cart(self):
        selected = self.pos_tree.selection()
        if not selected:
            return
        idx = int(self.pos_tree.item(selected[0])["values"][0]) - 1
        if 0 <= idx < len(self.cart_items):
            del self.cart_items[idx]
            self.refresh_cart_view()

    def clear_cart(self):
        self.cart_items.clear()
        self.refresh_cart_view()
        self.ent_tendered.delete(0, "end")
        self.lbl_change.configure(text="$0.00")

    def calculate_change(self):
        total = sum(i["subtotal"] for i in self.cart_items)
        try:
            tendered = float(self.ent_tendered.get().strip() or 0)
        except ValueError:
            tendered = 0.0

        method = self.cmb_payment_method.get()
        if "Tarjeta" in method or "Transferencia" in method:
            self.lbl_change.configure(text="$0.00")
            return

        if tendered >= total and total > 0:
            change = tendered - total
            self.lbl_change.configure(text=f"\${change:,.2f}", text_color="#4caf50")
        else:
            self.lbl_change.configure(text="$0.00", text_color="gray60")

    def execute_checkout(self):
        if not self.cart_items:
            messagebox.showwarning("Carrito Vacío", "Agregue al menos un producto al carrito para cobrar.")
            return

        total = sum(i["subtotal"] for i in self.cart_items)
        method = self.cmb_payment_method.get()

        try:
            tendered = float(self.ent_tendered.get().strip() or total)
        except ValueError:
            tendered = total

        if "Efectivo" in method and tendered < total:
            messagebox.showerror("Monto Insuficiente", f"El monto recibido (\${tendered:,.2f}) es menor al total (\${total:,.2f}).")
            return

        change = max(0.0, tendered - total) if "Efectivo" in method else 0.0

        # Registrar venta en SQLite de forma atómica
        folio = f"TICK-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        venta_id = self.db.create_sale(
            folio_ticket=folio,
            total=total,
            metodo_pago=method,
            monto_pagado=tendered,
            cambio=change,
            items=self.cart_items
        )

        if not venta_id:
            messagebox.showerror("Error", "No se pudo registrar la venta en la base de datos.")
            return

        # Imprimir o mostrar ticket térmico
        if self.chk_print_ticket.get():
            ticket_text = self.printer.generate_ticket(
                folio=folio,
                items=self.cart_items,
                total=total,
                metodo_pago=method,
                pagado=tendered,
                cambio=change
            )
            self.printer.print_or_show_ticket(ticket_text, folio)

        messagebox.showinfo(
            "Venta Exitosa",
            f"✅ Venta registrada con éxito.\\nFolio: {folio}\\nTotal: \${total:,.2f}\\nCambio: \${change:,.2f}"
        )

        # Limpiar carrito y actualizar vistas
        self.clear_cart()
        self.refresh_inventory_table()
        self.refresh_movements_table()

    # -------------------------------------------------------------------------
    # PESTAÑA 3: REGISTRO DE MOVIMIENTOS (KARDEX)
    # -------------------------------------------------------------------------
    def build_movements_tab(self):
        top_bar = ctk.CTkFrame(self.tab_movements, fg_color="transparent")
        top_bar.pack(fill="x", padx=10, pady=10)

        ctk.CTkLabel(top_bar, text="Tipo de Movimiento:").pack(side="left", padx=(0, 5))
        self.mov_filter_tipo = ctk.CTkOptionMenu(
            top_bar,
            values=["TODOS", "ENTRADA", "SALIDA", "AJUSTE"],
            command=lambda c: self.refresh_movements_table()
        )
        self.mov_filter_tipo.pack(side="left", padx=5)

        btn_refresh = ctk.CTkButton(top_bar, text="🔄 Actualizar", width=110, command=self.refresh_movements_table)
        btn_refresh.pack(side="left", padx=10)

        btn_export = ctk.CTkButton(
            top_bar,
            text="📥 Exportar CSV",
            width=120,
            fg_color="#37474f",
            hover_color="#263238",
            command=self.export_movements_csv
        )
        btn_export.pack(side="right", padx=5)

        table_frame = ctk.CTkFrame(self.tab_movements, corner_radius=8)
        table_frame.pack(fill="both", expand=True, padx=10, pady=5)

        columns = ("id", "fecha", "tipo", "producto", "cantidad", "motivo", "factura", "usuario")
        self.mov_tree = ttk.Treeview(table_frame, columns=columns, show="headings", selectmode="browse")

        self.mov_tree.heading("id", text="#")
        self.mov_tree.heading("fecha", text="Fecha y Hora")
        self.mov_tree.heading("tipo", text="Tipo")
        self.mov_tree.heading("producto", text="Producto Afectado")
        self.mov_tree.heading("cantidad", text="Cantidad")
        self.mov_tree.heading("motivo", text="Motivo / Justificación")
        self.mov_tree.heading("factura", text="Factura Ref.")
        self.mov_tree.heading("usuario", text="Usuario")

        self.mov_tree.column("id", width=45, anchor="center")
        self.mov_tree.column("fecha", width=145, anchor="center")
        self.mov_tree.column("tipo", width=90, anchor="center")
        self.mov_tree.column("producto", width=250, anchor="w")
        self.mov_tree.column("cantidad", width=80, anchor="center")
        self.mov_tree.column("motivo", width=240, anchor="w")
        self.mov_tree.column("factura", width=120, anchor="center")
        self.mov_tree.column("usuario", width=80, anchor="center")

        y_scroll_mov = ttk.Scrollbar(table_frame, orient="vertical", command=self.mov_tree.yview)
        self.mov_tree.configure(yscrollcommand=y_scroll_mov.set)
        y_scroll_mov.pack(side="right", fill="y")
        self.mov_tree.pack(fill="both", expand=True)

    def refresh_movements_table(self):
        for row in self.mov_tree.get_children():
            self.mov_tree.delete(row)

        tipo = self.mov_filter_tipo.get() if hasattr(self, "mov_filter_tipo") else "TODOS"
        movements = self.db.get_movements(tipo_filter=tipo if tipo != "TODOS" else None)

        for m in movements:
            self.mov_tree.insert(
                "", "end",
                values=(
                    m["id"],
                    m["fecha"],
                    m["tipo"],
                    m.get("producto_nombre", "Producto Eliminado"),
                    f"{m['cantidad']:g}",
                    m["motivo"],
                    m.get("referencia_factura") or "-",
                    m.get("usuario") or "Admin"
                )
            )

    def export_movements_csv(self):
        file_path = filedialog.asksaveasfilename(
            defaultextension=".csv",
            filetypes=[("Archivo CSV", "*.csv")],
            title="Exportar Registro de Movimientos"
        )
        if not file_path:
            return

        import csv
        movements = self.db.get_movements()
        try:
            with open(file_path, mode="w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f)
                writer.writerow(["ID", "Fecha", "Tipo", "Producto", "Cantidad", "Motivo", "Referencia Factura", "Usuario"])
                for m in movements:
                    writer.writerow([
                        m["id"], m["fecha"], m["tipo"], m.get("producto_nombre", ""),
                        m["cantidad"], m["motivo"], m.get("referencia_factura", ""), m.get("usuario", "")
                    ])
            messagebox.showinfo("Exportado", f"Datos exportados correctamente en:\\n{file_path}")
        except Exception as e:
            messagebox.showerror("Error al exportar", str(e))

    # -------------------------------------------------------------------------
    # PESTAÑA 4: INTEGRACIÓN GEMINI AI (FACTURAS DE PROVEEDOR)
    # -------------------------------------------------------------------------
    def build_invoice_ai_tab(self):
        # Layout dividido: Panel Izquierdo (Carga y Foto), Panel Derecho (Extracción de Productos)
        container = ctk.CTkFrame(self.tab_invoice_ai, fg_color="transparent")
        container.pack(fill="both", expand=True, padx=10, pady=10)

        # Panel Izquierdo
        left_panel = ctk.CTkFrame(container, width=380, corner_radius=10)
        left_panel.pack(side="left", fill="y", padx=(0, 10))
        left_panel.pack_propagate(False)

        ctk.CTkLabel(
            left_panel,
            text="FOTO DE FACTURA",
            font=ctk.CTkFont(family="Segoe UI", size=16, weight="bold")
        ).pack(pady=(15, 5))

        ctk.CTkLabel(
            left_panel,
            text="Escanea una foto de factura de compra o recibo para extraer productos automáticamente con Gemini AI a SQLite.",
            wraplength=340,
            text_color="gray70",
            font=ctk.CTkFont(size=12)
        ).pack(padx=15, pady=(0, 10))

        # Botón Seleccionar Imagen
        btn_browse = ctk.CTkButton(
            left_panel,
            text="📁 Seleccionar Foto / Factura...",
            height=40,
            command=self.select_invoice_image
        )
        btn_browse.pack(fill="x", padx=20, pady=5)

        # Contenedor de Vista Previa de Imagen
        self.invoice_preview_label = ctk.CTkLabel(
            left_panel,
            text="Sin imagen seleccionada\\n(Formatos: PNG, JPG, WEBP, PDF)",
            height=260,
            corner_radius=8,
            fg_color=("gray85", "#1e1e1e")
        )
        self.invoice_preview_label.pack(fill="x", padx=20, pady=10)

        # Botón Escanear con Gemini
        self.btn_scan_gemini = ctk.CTkButton(
            left_panel,
            text="✨ Extraer Productos con Gemini",
            height=46,
            fg_color="#1f6aa5",
            hover_color="#144870",
            font=ctk.CTkFont(weight="bold"),
            command=self.start_gemini_extraction_thread
        )
        self.btn_scan_gemini.pack(fill="x", padx=20, pady=10)

        self.lbl_gemini_status = ctk.CTkLabel(
            left_panel,
            text="Listo para procesar",
            text_color="gray70",
            font=ctk.CTkFont(size=11)
        )
        self.lbl_gemini_status.pack(pady=5)

        # Panel Derecho: Productos Detectados y Revisión
        right_panel = ctk.CTkFrame(container, corner_radius=10)
        right_panel.pack(side="right", fill="both", expand=True)

        info_header = ctk.CTkFrame(right_panel, fg_color="transparent")
        info_header.pack(fill="x", padx=15, pady=15)

        self.lbl_invoice_meta = ctk.CTkLabel(
            info_header,
            text="Proveedor: - | Factura: - | Total: $0.00",
            font=ctk.CTkFont(size=14, weight="bold")
        )
        self.lbl_invoice_meta.pack(side="left")

        # Botón Importar a SQLite
        self.btn_import_sqlite = ctk.CTkButton(
            info_header,
            text="📥 Guardar e Ingresar al Inventario",
            fg_color="#2e7d32",
            hover_color="#1b5e20",
            height=38,
            state="disabled",
            command=self.save_extracted_items_to_database
        )
        self.btn_import_sqlite.pack(side="right")

        # Tabla de productos extraídos
        table_frame_ai = ctk.CTkFrame(right_panel, fg_color="transparent")
        table_frame_ai.pack(fill="both", expand=True, padx=15, pady=(0, 15))

        columns = ("codigo", "nombre", "categoria", "cantidad", "costo", "precio_sugerido", "unidad")
        self.ai_tree = ttk.Treeview(table_frame_ai, columns=columns, show="headings", selectmode="browse")

        self.ai_tree.heading("codigo", text="Cód. Barras")
        self.ai_tree.heading("nombre", text="Producto Extraído")
        self.ai_tree.heading("categoria", text="Categoría")
        self.ai_tree.heading("cantidad", text="Cant.")
        self.ai_tree.heading("costo", text="Costo Unit.")
        self.ai_tree.heading("precio_sugerido", text="P. Venta Sugerido")
        self.ai_tree.heading("unidad", text="Unidad")

        self.ai_tree.column("codigo", width=110, anchor="center")
        self.ai_tree.column("nombre", width=260, anchor="w")
        self.ai_tree.column("categoria", width=110, anchor="center")
        self.ai_tree.column("cantidad", width=65, anchor="center")
        self.ai_tree.column("costo", width=85, anchor="e")
        self.ai_tree.column("precio_sugerido", width=110, anchor="e")
        self.ai_tree.column("unidad", width=70, anchor="center")

        y_scroll_ai = ttk.Scrollbar(table_frame_ai, orient="vertical", command=self.ai_tree.yview)
        self.ai_tree.configure(yscrollcommand=y_scroll_ai.set)
        y_scroll_ai.pack(side="right", fill="y")
        self.ai_tree.pack(fill="both", expand=True)

    def select_invoice_image(self):
        file_path = filedialog.askopenfilename(
            title="Seleccionar factura de proveedor",
            filetypes=[("Imágenes", "*.jpg *.jpeg *.png *.webp *.bmp"), ("Todos los archivos", "*.*")]
        )
        if not file_path:
            return

        self.selected_invoice_path = file_path
        try:
            # Cargar y redimensionar vista previa con Pillow
            img = Image.open(file_path)
            img.thumbnail((320, 240))
            ctk_img = ctk.CTkImage(light_image=img, dark_image=img, size=img.size)
            self.invoice_preview_label.configure(image=ctk_img, text="")
            self.lbl_gemini_status.configure(
                text=f"Archivo cargado: {os.path.basename(file_path)}",
                text_color="white"
            )
        except Exception as e:
            messagebox.showerror("Error de Imagen", f"No se pudo cargar la imagen: {e}")

    def start_gemini_extraction_thread(self):
        if not self.selected_invoice_path:
            messagebox.showwarning("Atención", "Por favor seleccione primero una foto de factura.")
            return

        # Desactivar botón y poner estado de progreso
        self.btn_scan_gemini.configure(state="disabled", text="⏳ Analizando con Gemini...")
        self.lbl_gemini_status.configure(text="Enviando a Gemini API...", text_color="#29b6f6")

        # Ejecutar en hilo de fondo para no bloquear la interfaz gráfica
        thread = threading.Thread(target=self._run_gemini_worker, daemon=True)
        thread.start()

    def _run_gemini_worker(self):
        result = self.extractor.extract_invoice_data(self.selected_invoice_path)

        # Regresar al hilo principal de Tkinter para actualizar la UI
        self.after(0, lambda: self._handle_gemini_result(result))

    def _handle_gemini_result(self, result):
        self.btn_scan_gemini.configure(state="normal", text="✨ Extraer Productos con Gemini")

        if not result.get("success"):
            error_msg = result.get("error", "Error desconocido")
            is_offline = result.get("offline", False)
            if is_offline:
                self.lbl_gemini_status.configure(
                    text="Modo Híbrido: Sin conexión a Gemini API.",
                    text_color="#ffa726"
                )
                messagebox.showwarning(
                    "Modo Híbrido / Offline",
                    f"No se pudo conectar con la API de Gemini ({error_msg}).\\n\\n"
                    "El sistema continúa operando al 100% en local. Puede registrar sus productos "
                    "manualmente en la pestaña de 'Inventario' sin depender de internet."
                )
            else:
                self.lbl_gemini_status.configure(text="Error en extracción", text_color="#e57373")
                messagebox.showerror("Error de Extracción", error_msg)
            return

        # Éxito en la extracción
        data = result.get("data", {})
        self.extracted_invoice_data = data
        items = data.get("items", [])

        self.lbl_gemini_status.configure(
            text=f"✅ {len(items)} productos extraídos correctamente",
            text_color="#81c784"
        )

        proveedor = data.get("proveedor", "Proveedor Desconocido")
        folio = data.get("numero_factura", "S/N")
        total = data.get("total_factura", 0.0)

        self.lbl_invoice_meta.configure(
            text=f"Proveedor: {proveedor} | Factura: #{folio} | Total Factura: \${total:,.2f}"
        )

        # Poblar tabla
        for row in self.ai_tree.get_children():
            self.ai_tree.delete(row)

        for it in items:
            self.ai_tree.insert(
                "", "end",
                values=(
                    it.get("codigo_barras") or "N/A",
                    it.get("nombre", ""),
                    it.get("categoria", "General"),
                    it.get("cantidad", 1),
                    f"\${it.get('precio_costo', 0.0):,.2f}",
                    f"\${it.get('precio_venta', 0.0):,.2f}",
                    it.get("unidad_medida", "Pza")
                )
            )

        self.btn_import_sqlite.configure(state="normal")
        messagebox.showinfo(
            "Extracción Exitosa",
            f"Se han identificado {len(items)} artículos de la factura de '{proveedor}'.\\n"
            "Revise los datos en la tabla y presione 'Guardar e Ingresar al Inventario'."
        )

    def save_extracted_items_to_database(self):
        if not self.extracted_invoice_data:
            return

        items = self.extracted_invoice_data.get("items", [])
        folio = self.extracted_invoice_data.get("numero_factura", "FAC-GEMINI")
        proveedor = self.extracted_invoice_data.get("proveedor", "Proveedor")

        inserted, updated = self.db.batch_import_invoice_items(
            items=items,
            referencia_factura=f"{proveedor} - #{folio}"
        )

        messagebox.showinfo(
            "Inventario Actualizado",
            f"✅ Operación completada:\\n- Productos nuevos dados de alta: {inserted}\\n"
            f"- Productos con stock aumentado: {updated}\\n- Registrado movimiento de ENTRADA en Kardex."
        )

        self.btn_import_sqlite.configure(state="disabled")
        self.refresh_inventory_table()
        self.refresh_movements_table()
        self.tabview.set("📦 Inventario")

    # -------------------------------------------------------------------------
    # BARRA DE ESTADO INFERIOR
    # -------------------------------------------------------------------------
    def create_statusbar(self):
        status_bar = ctk.CTkFrame(self, height=28, corner_radius=0, fg_color=("#e0e0e0", "#141414"))
        status_bar.pack(fill="x", side="bottom")

        lbl_db = ctk.CTkLabel(
            status_bar,
            text=f"📁 Base de Datos: {os.path.abspath('inventario.db')}",
            font=ctk.CTkFont(size=11),
            text_color="gray60"
        )
        lbl_db.pack(side="left", padx=15)

        lbl_engine = ctk.CTkLabel(
            status_bar,
            text="Motor: SQLite 3 | UI: CustomTkinter 5.2 | AI: Google GenAI (Gemini 3.8 Flash)",
            font=ctk.CTkFont(size=11),
            text_color="gray60"
        )
        lbl_engine.pack(side="right", padx=15)


if __name__ == "__main__":
    app = InventoryApp()
    app.mainloop()
`
  },
  {
    name: "database.py",
    description: "Manejo completo de SQLite (inventario.db) con esquema de tablas, transacciones atómicas y kardex",
    path: "database.py",
    language: "python",
    content: `"""
=============================================================================
MÓDULO DE BASE DE DATOS SQLITE (inventario.db)
Gestiona tablas de Productos, Categorías, Entradas/Salidas y Ventas.
Diseñado para alta integridad, transaccionalidad atómica y modo offline 100%.
=============================================================================
"""

import sqlite3
import os
from datetime import datetime


class Database:
    def __init__(self, db_path="inventario.db"):
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        """Retorna una conexión configurada con soporte para claves foráneas y modo WAL."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        return conn

    def init_db(self):
        """Crea las 4 tablas principales y relaciones si no existen."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 1. TABLA CATEGORÍAS
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS categorias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE NOT NULL,
                descripcion TEXT
            );
            """)

            # 2. TABLA PRODUCTOS (Adaptado a LISLR Art. 177 y Ley de IVA)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo_barras TEXT UNIQUE,
                nombre TEXT NOT NULL,
                categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
                stock_actual REAL DEFAULT 0,
                stock_minimo REAL DEFAULT 5,
                precio_costo REAL DEFAULT 0,
                costo_promedio_ponderado REAL DEFAULT 0,
                precio_venta REAL NOT NULL,
                alicuota_iva REAL DEFAULT 16, -- 0 para exentos (canasta básica), 16 alícuota general
                unidad_medida TEXT DEFAULT 'Pza',
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # 3. TABLA MOVIMIENTOS / KARDEX (Reglamento LISLR Art. 177)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS movimientos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
                tipo TEXT CHECK(tipo IN ('ENTRADA', 'SALIDA', 'AJUSTE')) NOT NULL,
                cantidad REAL NOT NULL,
                costo_unitario REAL,
                costo_promedio_ponderado REAL,
                stock_resultante REAL,
                motivo TEXT NOT NULL,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                usuario TEXT DEFAULT 'Admin Fiscal',
                referencia_factura TEXT
            );
            """)

            # 4. TABLA VENTAS / FACTURAS (Providencia SNAT/00071 & IGTF)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS ventas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                folio_ticket TEXT UNIQUE NOT NULL,
                numero_factura TEXT NOT NULL,
                numero_control TEXT NOT NULL,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                cliente_rif TEXT DEFAULT 'V-00000000-0',
                cliente_nombre TEXT DEFAULT 'CONSUMIDOR FINAL',
                cliente_direccion TEXT DEFAULT 'CIUDAD',
                tasa_bcv REAL NOT NULL,
                base_exenta_usd REAL DEFAULT 0,
                base_imponible_usd REAL DEFAULT 0,
                iva_usd REAL DEFAULT 0,
                igtf_usd REAL DEFAULT 0,
                total_usd REAL NOT NULL,
                base_exenta_ves REAL DEFAULT 0,
                base_imponible_ves REAL DEFAULT 0,
                iva_ves REAL DEFAULT 0,
                igtf_ves REAL DEFAULT 0,
                total_ves REAL NOT NULL,
                metodo_pago TEXT DEFAULT 'Divisas en Efectivo',
                monto_pagado REAL,
                cambio REAL,
                estado TEXT DEFAULT 'EMITIDA'
            );
            """)

            # 5. TABLA DETALLE DE VENTAS
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS detalle_ventas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
                producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
                cantidad REAL NOT NULL,
                precio_unitario REAL NOT NULL,
                alicuota_iva REAL DEFAULT 16,
                es_exento INTEGER DEFAULT 0,
                subtotal REAL NOT NULL
            );
            """)

            # Insertar categorías iniciales si la tabla está vacía
            cursor.execute("SELECT COUNT(*) as count FROM categorias;")
            if cursor.fetchone()["count"] == 0:
                categorias_iniciales = [
                    ("Víveres y Granos", "Alimentos básicos (Exentos de IVA según Ley)"),
                    ("Bebidas y Refrescos", "Bebidas pasteurizadas y gaseosas (Gravados 16% IVA)"),
                    ("Cuidado y Aseo", "Artículos de limpieza y aseo personal (Gravados 16% IVA)"),
                    ("Lácteos y Derivados", "Leche y quesos pasteurizados (Exentos de IVA)"),
                    ("Charcutería", "Embutidos y carnes preparadas (Gravados 16% IVA)"),
                    ("Golosinas y Snacks", "Snacks y confitería (Gravados 16% IVA)")
                ]
                cursor.executemany("INSERT INTO categorias (nombre, descripcion) VALUES (?, ?);", categorias_iniciales)

            # Insertar productos demo adaptados a Venezuela
            cursor.execute("SELECT COUNT(*) as count FROM productos;")
            if cursor.fetchone()["count"] == 0:
                productos_demo = [
                    ("7591001000101", "Harina PAN Blanca Maíz 1kg", 1, 45, 15, 1.05, 1.05, 1.40, 0, "Pza"),
                    ("7591002000202", "Arroz Blanco Grano Entero 1kg", 1, 38, 12, 1.15, 1.15, 1.55, 0, "Pza"),
                    ("7591003000303", "Pasta Primor Espagueti 1kg", 1, 30, 10, 1.25, 1.25, 1.70, 0, "Pza"),
                    ("7591004000404", "Aceite Vegetal Mazeite 1L", 1, 25, 8, 2.50, 2.50, 3.40, 16, "Pza"),
                    ("7591005000505", "Leche Completa Pasteurizada 1L", 4, 20, 10, 1.60, 1.60, 2.10, 0, "Pza"),
                    ("7591006000606", "Refresco Coca-Cola 1.5L", 2, 32, 10, 1.50, 1.50, 2.20, 16, "Pza"),
                    ("7591007000707", "Detergente en Polvo Las Llaves 1kg", 3, 28, 8, 2.10, 2.10, 2.95, 16, "Pza"),
                    ("7591008000808", "Jabón de Baño Protex 110g", 3, 50, 15, 0.80, 0.80, 1.15, 16, "Pza")
                ]
                cursor.executemany("""
                INSERT INTO productos (codigo_barras, nombre, categoria_id, stock_actual, stock_minimo, precio_costo, costo_promedio_ponderado, precio_venta, alicuota_iva, unidad_medida)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, productos_demo)

                # Registrar movimientos de entrada inicial con PMP en Kardex
                cursor.execute("""
                INSERT INTO movimientos (producto_id, tipo, cantidad, costo_unitario, costo_promedio_ponderado, stock_resultante, motivo, usuario)
                SELECT id, 'ENTRADA', stock_actual, precio_costo, costo_promedio_ponderado, stock_actual, 'Inventario Inicial Apertura (Art. 177)', 'Sistema Fiscal' FROM productos;
                """)

            conn.commit()

    # -------------------------------------------------------------------------
    # OPERACIONES DE CATEGORÍAS
    # -------------------------------------------------------------------------
    def get_categories(self):
        with self.get_connection() as conn:
            return [dict(r) for r in conn.execute("SELECT * FROM categorias ORDER BY nombre ASC;").fetchall()]

    # -------------------------------------------------------------------------
    # OPERACIONES DE PRODUCTOS
    # -------------------------------------------------------------------------
    def get_products(self, search="", category_id=None):
        with self.get_connection() as conn:
            query = """
            SELECT p.*, c.nombre as categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE 1=1
            """
            params = []
            if search:
                query += " AND (p.nombre LIKE ? OR p.codigo_barras LIKE ?)"
                params.extend([f"%{search}%", f"%{search}%"])
            if category_id:
                query += " AND p.categoria_id = ?"
                params.append(category_id)

            query += " ORDER BY p.nombre ASC;"
            return [dict(r) for r in conn.execute(query, params).fetchall()]

    def get_product_by_id(self, prod_id):
        with self.get_connection() as conn:
            row = conn.execute("SELECT * FROM productos WHERE id = ?;", (prod_id,)).fetchone()
            return dict(row) if row else None

    def find_product_by_barcode_or_name(self, query):
        with self.get_connection() as conn:
            # Primero intento exacto por código de barras
            row = conn.execute("SELECT * FROM productos WHERE codigo_barras = ?;", (query,)).fetchone()
            if not row:
                # Intento por nombre parcial
                row = conn.execute("SELECT * FROM productos WHERE nombre LIKE ? LIMIT 1;", (f"%{query}%",)).fetchone()
            return dict(row) if row else None

    def add_product(self, codigo_barras, nombre, categoria_id, stock_actual, stock_minimo, precio_costo, precio_venta, unidad_medida="Pza"):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO productos (codigo_barras, nombre, categoria_id, stock_actual, stock_minimo, precio_costo, precio_venta, unidad_medida)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, (codigo_barras, nombre, categoria_id, stock_actual, stock_minimo, precio_costo, precio_venta, unidad_medida))
            prod_id = cursor.lastrowid

            if stock_actual > 0:
                cursor.execute("""
                INSERT INTO movimientos (producto_id, tipo, cantidad, motivo, usuario)
                VALUES (?, 'ENTRADA', ?, 'Stock Inicial de Alta', 'Admin');
                """, (prod_id, stock_actual))

            conn.commit()
            return prod_id

    def update_product(self, prod_id, codigo_barras, nombre, categoria_id, stock_actual, stock_minimo, precio_costo, precio_venta, unidad_medida="Pza"):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Obtener stock previo para registrar movimiento si difiere
            prev = conn.execute("SELECT stock_actual FROM productos WHERE id = ?;", (prod_id,)).fetchone()
            prev_stock = prev["stock_actual"] if prev else 0

            cursor.execute("""
            UPDATE productos
            SET codigo_barras = ?, nombre = ?, categoria_id = ?, stock_actual = ?, stock_minimo = ?,
                precio_costo = ?, precio_venta = ?, unidad_medida = ?
            WHERE id = ?;
            """, (codigo_barras, nombre, categoria_id, stock_actual, stock_minimo, precio_costo, precio_venta, unidad_medida, prod_id))

            diff = stock_actual - prev_stock
            if abs(diff) > 0.0001:
                tipo = "ENTRADA" if diff > 0 else "SALIDA"
                cursor.execute("""
                INSERT INTO movimientos (producto_id, tipo, cantidad, motivo, usuario)
                VALUES (?, ?, ?, 'Ajuste manual al editar producto', 'Admin');
                """, (prod_id, tipo, abs(diff)))

            conn.commit()

    def delete_product(self, prod_id):
        with self.get_connection() as conn:
            conn.execute("DELETE FROM productos WHERE id = ?;", (prod_id,))
            conn.commit()

    # -------------------------------------------------------------------------
    # OPERACIONES DE MOVIMIENTOS Y KARDEX (LISLR Art. 177)
    # -------------------------------------------------------------------------
    def record_movement(self, producto_id, tipo, cantidad, motivo, usuario="Admin Fiscal", referencia_factura=None, costo_compra=None):
        """
        Registra movimiento en Kardex permanente aplicando:
        1. Fórmula de Costo Promedio Ponderado (PMP):
           Nuevo_Costo_Promedio = ((Stock_Actual * Costo_Promedio_Actual) + (Cant_Entrada * Costo_Compra)) / (Stock_Actual + Cant_Entrada)
        2. Prohibición expresa de existencias negativas (Reglamento LISLR Art. 177)
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            p = conn.execute("SELECT stock_actual, precio_costo, costo_promedio_ponderado FROM productos WHERE id = ?;", (producto_id,)).fetchone()
            if not p:
                raise ValueError("Producto no encontrado")

            stock_act = p["stock_actual"]
            costo_act = p["costo_promedio_ponderado"] or p["precio_costo"] or 0.0

            if tipo == "ENTRADA":
                costo_in = costo_compra if (costo_compra is not None and costo_compra > 0) else costo_act
                nuevo_stock = stock_act + cantidad
                if nuevo_stock > 0:
                    nuevo_pmp = round(((stock_act * costo_act) + (cantidad * costo_in)) / nuevo_stock, 4)
                else:
                    nuevo_pmp = costo_in

                cursor.execute("""
                UPDATE productos 
                SET stock_actual = ?, costo_promedio_ponderado = ?, precio_costo = ?
                WHERE id = ?;
                """, (nuevo_stock, nuevo_pmp, nuevo_pmp, producto_id))

                costo_unit = costo_in
                pmp_res = nuevo_pmp
                stock_res = nuevo_stock

            elif tipo == "SALIDA":
                # PROHIBICIÓN EXPRESA DE EXISTENCIAS NEGATIVAS (Art. 177)
                if cantidad > stock_act:
                    raise ValueError(f"Infracción Art. 177 LISLR: Saldo insuficiente ({stock_act}) para salida de {cantidad}.")

                nuevo_stock = stock_act - cantidad
                cursor.execute("UPDATE productos SET stock_actual = ? WHERE id = ?;", (nuevo_stock, producto_id))
                costo_unit = costo_act
                pmp_res = costo_act
                stock_res = nuevo_stock

            elif tipo == "AJUSTE":
                if cantidad < 0:
                    raise ValueError("El saldo físico en un ajuste no puede ser negativo.")
                nuevo_stock = cantidad
                cursor.execute("UPDATE productos SET stock_actual = ? WHERE id = ?;", (nuevo_stock, producto_id))
                costo_unit = costo_act
                pmp_res = costo_act
                stock_res = nuevo_stock

            cursor.execute("""
            INSERT INTO movimientos (producto_id, tipo, cantidad, costo_unitario, costo_promedio_ponderado, stock_resultante, motivo, usuario, referencia_factura)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (producto_id, tipo, cantidad, costo_unit, pmp_res, stock_res, motivo, usuario, referencia_factura))

            conn.commit()
            return nuevo_stock, pmp_res

    def get_movements(self, tipo_filter=None):
        with self.get_connection() as conn:
            query = """
            SELECT m.*, p.nombre as producto_nombre
            FROM movimientos m
            LEFT JOIN productos p ON m.producto_id = p.id
            WHERE 1=1
            """
            params = []
            if tipo_filter and tipo_filter != "TODOS":
                query += " AND m.tipo = ?"
                params.append(tipo_filter)

            query += " ORDER BY m.fecha DESC, m.id DESC LIMIT 200;"
            return [dict(r) for r in conn.execute(query, params).fetchall()]

    # -------------------------------------------------------------------------
    # OPERACIONES DEL PUNTO DE VENTA (FACTURACIÓN SENIAT & IGTF)
    # -------------------------------------------------------------------------
    def create_sale(self, numero_factura, numero_control, cliente_rif, cliente_nombre, cliente_direccion,
                    tasa_bcv, metodo_pago, monto_pagado, cambio, items):
        """
        Emisión de Factura Fiscal en cumplimiento de Providencia SNAT/00071:
        - Valida stock estricto sin existencias negativas (LISLR Art. 177)
        - Desglosa Base Exenta, Base Imponible (16%), IVA (16%), IGTF (3% para Divisas/Crypto)
        - Convierte y almacena montos duales en USD y Bolívares (VES) a Tasa Oficial BCV
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                # 1. Validación previa obligatoria de stock disponible
                for it in items:
                    prod = conn.execute("SELECT nombre, stock_actual FROM productos WHERE id = ?;", (it["producto_id"],)).fetchone()
                    if not prod or it["cantidad"] > prod["stock_actual"]:
                        raise ValueError(f"Stock insuficiente para '{prod['nombre'] if prod else it['producto_id']}'. Disponible: {prod['stock_actual'] if prod else 0}")

                # 2. Desglose fiscal dual USD y VES
                base_exenta_usd = 0.0
                base_imponible_usd = 0.0
                for it in items:
                    sub = it["subtotal"]
                    if it.get("alicuota_iva", 16) == 0:
                        base_exenta_usd += sub
                    else:
                        base_imponible_usd += sub

                iva_usd = round(base_imponible_usd * 0.16, 2)
                subtotal_con_iva = base_exenta_usd + base_imponible_usd + iva_usd

                aplica_igtf = metodo_pago in ["Divisas en Efectivo", "Criptoactivos"]
                igtf_usd = round(subtotal_con_iva * 0.03, 2) if aplica_igtf else 0.0
                total_usd = round(subtotal_con_iva + igtf_usd, 2)

                # Conversión a Bolívares con Tasa BCV
                base_exenta_ves = round(base_exenta_usd * tasa_bcv, 2)
                base_imponible_ves = round(base_imponible_usd * tasa_bcv, 2)
                iva_ves = round(iva_usd * tasa_bcv, 2)
                igtf_ves = round(igtf_usd * tasa_bcv, 2)
                total_ves = round(total_usd * tasa_bcv, 2)

                # 3. Guardar encabezado de factura
                cursor.execute("""
                INSERT INTO ventas (
                    folio_ticket, numero_factura, numero_control, cliente_rif, cliente_nombre, cliente_direccion,
                    tasa_bcv, base_exenta_usd, base_imponible_usd, iva_usd, igtf_usd, total_usd,
                    base_exenta_ves, base_imponible_ves, iva_ves, igtf_ves, total_ves,
                    metodo_pago, monto_pagado, cambio
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    numero_factura, numero_factura, numero_control, cliente_rif, cliente_nombre, cliente_direccion,
                    tasa_bcv, base_exenta_usd, base_imponible_usd, iva_usd, igtf_usd, total_usd,
                    base_exenta_ves, base_imponible_ves, iva_ves, igtf_ves, total_ves,
                    metodo_pago, monto_pagado, cambio
                ))
                venta_id = cursor.lastrowid

                # 4. Insertar renglones y registrar salida en Kardex (LISLR Art. 177)
                for item in items:
                    prod_id = item["producto_id"]
                    qty = item["cantidad"]
                    price = item["precio"]
                    subtotal = item["subtotal"]
                    alicuota = item.get("alicuota_iva", 16)
                    es_exento = 1 if alicuota == 0 else 0

                    cursor.execute("""
                    INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, alicuota_iva, es_exento, subtotal)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                    """, (venta_id, prod_id, qty, price, alicuota, es_exento, subtotal))

                    # Obtener costo PMP para el Kardex
                    prod_info = conn.execute("SELECT stock_actual, precio_costo, costo_promedio_ponderado FROM productos WHERE id = ?;", (prod_id,)).fetchone()
                    stock_prev = prod_info["stock_actual"]
                    pmp_actual = prod_info["costo_promedio_ponderado"] or prod_info["precio_costo"] or 0.0
                    stock_res = stock_prev - qty

                    cursor.execute("UPDATE productos SET stock_actual = ? WHERE id = ?;", (stock_res, prod_id))

                    cursor.execute("""
                    INSERT INTO movimientos (producto_id, tipo, cantidad, costo_unitario, costo_promedio_ponderado, stock_resultante, motivo, usuario, referencia_factura)
                    VALUES (?, 'SALIDA', ?, ?, ?, ?, ?, 'Caja Fiscal', ?);
                    """, (prod_id, qty, pmp_actual, pmp_actual, stock_res, f"Factura Fiscal {numero_factura} ({cliente_nombre})", numero_factura))

                conn.commit()
                return venta_id
            except Exception as e:
                conn.rollback()
                print("Error en transacción de factura fiscal:", e)
                raise e

    # -------------------------------------------------------------------------
    # BATCH IMPORT DE FACTURAS GEMINI
    # -------------------------------------------------------------------------
    def batch_import_invoice_items(self, items, referencia_factura):
        """Inserta o actualiza productos extraídos por la IA y registra ENTRADA en kardex."""
        inserted = 0
        updated = 0

        with self.get_connection() as conn:
            cursor = conn.cursor()

            for item in items:
                code = item.get("codigo_barras")
                nombre = item.get("nombre", "").strip()
                qty = float(item.get("cantidad", 1))
                cost = float(item.get("precio_costo", 0.0))
                price = float(item.get("precio_venta", cost * 1.35))
                unidad = item.get("unidad_medida", "Pza")
                cat_nombre = item.get("categoria", "General")

                # Buscar o crear categoría
                cat_row = conn.execute("SELECT id FROM categorias WHERE nombre = ?;", (cat_nombre,)).fetchone()
                if cat_row:
                    cat_id = cat_row["id"]
                else:
                    cursor.execute("INSERT INTO categorias (nombre, descripcion) VALUES (?, 'Creada por escaneo de factura');", (cat_nombre,))
                    cat_id = cursor.lastrowid

                # Verificar si ya existe por código o nombre
                existing = None
                if code and code != "N/A":
                    existing = conn.execute("SELECT id, stock_actual FROM productos WHERE codigo_barras = ?;", (code,)).fetchone()
                if not existing:
                    existing = conn.execute("SELECT id, stock_actual FROM productos WHERE nombre = ?;", (nombre,)).fetchone()

                if existing:
                    prod_id = existing["id"]
                    cursor.execute("""
                    UPDATE productos
                    SET stock_actual = stock_actual + ?, precio_costo = ?, precio_venta = ?
                    WHERE id = ?;
                    """, (qty, cost, price, prod_id))
                    updated += 1
                else:
                    cursor.execute("""
                    INSERT INTO productos (codigo_barras, nombre, categoria_id, stock_actual, stock_minimo, precio_costo, precio_venta, unidad_medida)
                    VALUES (?, ?, ?, ?, 5, ?, ?, ?);
                    """, (code, nombre, cat_id, qty, cost, price, unidad))
                    prod_id = cursor.lastrowid
                    inserted += 1

                # Registrar movimiento de ENTRADA
                cursor.execute("""
                INSERT INTO movimientos (producto_id, tipo, cantidad, motivo, usuario, referencia_factura)
                VALUES (?, 'ENTRADA', ?, 'Factura de Compra', 'Gemini AI', ?);
                """, (prod_id, qty, referencia_factura))

            conn.commit()

        return inserted, updated
`
  },
  {
    name: "gemini_extractor.py",
    description: "Módulo con SDK google-genai para escanear facturas en imagen y modo híbrido offline",
    path: "gemini_extractor.py",
    language: "python",
    content: `"""
=============================================================================
INTEGRACIÓN CON GOOGLE GEMINI API (google-genai SDK)
Extrae datos estructurados de facturas de proveedores (foto/imagen).
Incluye detección de conectividad y modo HÍBRIDO 100% offline.
=============================================================================
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


class GeminiInvoiceExtractor:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = None
        self._init_client()

    def _init_client(self):
        """Inicializa el cliente de google-genai si la librería y la clave están disponibles."""
        if GENAI_AVAILABLE and self.api_key and self.api_key != "MY_GEMINI_API_KEY":
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print("Error al inicializar cliente de Gemini:", e)
                self.client = None

    def is_configured(self):
        """Indica si el módulo puede comunicarse con Gemini (modo Online vs. Híbrido Offline)."""
        return self.client is not None

    def extract_invoice_data(self, image_path):
        """
        Envía la foto de la factura al modelo 'gemini-3.8-flash'
        y extrae proveedor, número de factura y lista de productos con costo y precio sugerido.
        Si no hay internet o API Key, retorna diagnóstico sin fallar (modo híbrido).
        """
        if not GENAI_AVAILABLE:
            return {
                "success": False,
                "offline": True,
                "error": "La librería 'google-genai' no está instalada. Ejecute: pip install google-genai"
            }

        if not self.is_configured():
            return {
                "success": False,
                "offline": True,
                "error": "No hay GEMINI_API_KEY configurada en el archivo .env o en variables de entorno."
            }

        if not os.path.exists(image_path):
            return {
                "success": False,
                "offline": False,
                "error": f"El archivo no existe: {image_path}"
            }

        try:
            # Leer imagen en bytes
            with open(image_path, "rb") as f:
                image_bytes = f.read()

            # Determinar mimeType básico según extensión
            ext = Path(image_path).suffix.lower()
            mime_map = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".webp": "image/webp"
            }
            mime_type = mime_map.get(ext, "image/jpeg")

            prompt = """
            Eres un experto en contabilidad e inventarios.
            Analiza con máxima precisión esta foto de factura de compra o recibo de proveedor.
            Extrae y devuelve un JSON EXACTO con esta estructura:
            {
              "proveedor": "Nombre del emisor o empresa proveedora",
              "numero_factura": "Folio o número de factura",
              "fecha": "YYYY-MM-DD",
              "total_factura": 1250.50,
              "items": [
                {
                  "codigo_barras": "Código de barras o SKU si es visible (o sugerir uno numérico de 13 dígitos tipo 750...)",
                  "nombre": "Descripción clara del producto (ej: Atún en Agua 140g)",
                  "categoria": "Categoría adecuada (Abarrotes, Bebidas, Limpieza, Farmacia, Ferretería, General)",
                  "cantidad": 12.0,
                  "precio_costo": 14.50,
                  "precio_venta": 21.00,
                  "unidad_medida": "Pza"
                }
              ]
            }
            Calcula el 'precio_venta' sugerido aplicando un margen de ganancia del 30% al 45% sobre el precio_costo.
            Devuelve ÚNICAMENTE el objeto JSON sin bloques de texto adicionales.
            """

            # Llamar a Gemini con el modelo oficial gemini-3.8-flash
            response = self.client.models.generateContent(
                model="gemini-3.8-flash",
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )

            response_text = response.text.strip()
            # Limpiar bloques markdown si vinieran
            if response_text.startswith("\`\`\`json"):
                response_text = response_text[7:]
            elif response_text.startswith("\`\`\`"):
                response_text = response_text[3:]
            if response_text.endswith("\`\`\`"):
                response_text = response_text[:-3]

            response_text = response_text.strip()

            parsed_data = json.loads(response_text)
            return {
                "success": True,
                "data": parsed_data
            }

        except Exception as e:
            err_str = str(e)
            is_offline_issue = any(k in err_str.lower() for k in ["connection", "timeout", "network", "dns", "api_key", "401", "403"])
            return {
                "success": False,
                "offline": is_offline_issue,
                "error": f"Fallo al consultar Gemini: {err_str}"
            }
`
  },
  {
    name: "ticket_printer.py",
    description: "Generador de Facturas Fiscales y Tickets térmicos (Providencia SNAT/00071, LISLR e IGTF)",
    path: "ticket_printer.py",
    language: "python",
    content: `"""
=============================================================================
MÓDULO DE EMISIÓN DE FACTURAS FISCALES Y TICKETS (Providencia SNAT/00071)
Genera formato térmico para impresoras POS de 58mm y 80mm con:
- Datos fiscales del Emisor (RIF, Domicilio, Condición IVA)
- Datos fiscales del Receptor (RIF V/J/G/E/P, Razón Social)
- Correlativo N° Factura y N° Control
- Discriminación de IVA (Exento y Alícuota General 16%)
- IGTF 3% en pagos con Divisas o Criptoactivos
- Doble expresión monetaria (USD y Bolívares VES según Tasa Oficial BCV)
=============================================================================
"""

import os
import sys
import tempfile
from datetime import datetime


class TicketPrinter:
    def __init__(
        self,
        business_name="INVERSIONES & DISTRIBUCIONES CARACAS, C.A.",
        rif="J-31456789-2",
        direccion="Av. Francisco de Miranda, Edif. Centro Empresarial, Chacao, Caracas",
        telefono="(0212) 285-4011",
        providencia="SNAT/00071 - Contribuyente Ordinario IVA"
    ):
        self.business_name = business_name
        self.rif = rif
        self.direccion = direccion
        self.telefono = telefono
        self.providencia = providencia

    def generate_fiscal_invoice(
        self,
        numero_factura,
        numero_control,
        cliente_rif,
        cliente_nombre,
        cliente_direccion,
        items,
        base_exenta_usd,
        base_imponible_usd,
        iva_usd,
        igtf_usd,
        total_usd,
        tasa_bcv,
        metodo_pago,
        monto_pagado,
        cambio
    ):
        """Genera el texto plano con formato fiscal para rollo térmico estándar."""
        fecha_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        ancho = 42

        linea_doble = "=" * ancho
        linea_simple = "-" * ancho

        # Cálculos en Bolívares
        base_exenta_ves = base_exenta_usd * tasa_bcv
        base_imponible_ves = base_imponible_usd * tasa_bcv
        iva_ves = iva_usd * tasa_bcv
        igtf_ves = igtf_usd * tasa_bcv
        total_ves = total_usd * tasa_bcv

        lines = [
            linea_doble,
            self.business_name.center(ancho),
            f"R.I.F.: {self.rif}".center(ancho),
            self.direccion[:ancho].center(ancho),
            f"Teléf.: {self.telefono}".center(ancho),
            self.providencia.center(ancho),
            linea_simple,
            f"FACTURA FISCAL N°:  {numero_factura}",
            f"NUMERO DE CONTROL:  {numero_control}",
            f"FECHA / HORA:       {fecha_str}",
            f"TASA OFICIAL BCV:   Bs. {tasa_bcv:.2f} / USD",
            linea_simple,
            "DATOS DEL CLIENTE / RECEPTOR:",
            f"RIF / C.I.: {cliente_rif}",
            f"NOMBRE:     {cliente_nombre[:30]}",
            f"DOMICILIO:  {cliente_direccion[:30]}",
            linea_simple,
            f"{'CANT':<5} {'DESCRIPCIÓN':<19} {'IVA':<3} {'P.U.($)':>6} {'TOTAL':>7}",
            linea_simple
        ]

        total_piezas = 0
        for it in items:
            nombre = it["nombre"][:19]
            qty = it["cantidad"]
            precio = it["precio"]
            sub = it["subtotal"]
            iva_tipo = "(E)" if it.get("alicuota_iva", 16) == 0 else "(G)"
            total_piezas += qty

            lines.append(f"{qty:<5g} {nombre:<19} {iva_tipo:<3} {precio:>6.2f} {sub:>7.2f}")

        lines.extend([
            linea_simple,
            f"TOTAL ARTÍCULOS: {total_piezas:g}".rjust(ancho),
            linea_simple,
            "RESUMEN TRIBUTARIO (USD / Bs.):",
            f"Monto Exento (E):       \${base_exenta_usd:>7.2f} / Bs. {base_exenta_ves:>8.2f}",
            f"Base Imponible (G 16%): \${base_imponible_usd:>7.2f} / Bs. {base_imponible_ves:>8.2f}",
            f"I.V.A. (16%):           \${iva_usd:>7.2f} / Bs. {iva_ves:>8.2f}"
        ])

        if igtf_usd > 0:
            lines.append(f"I.G.T.F. (3% Divisas):  \${igtf_usd:>7.2f} / Bs. {igtf_ves:>8.2f}")

        lines.extend([
            linea_doble,
            f"TOTAL FACTURA (USD):    \${total_usd:>10.2f}".rjust(ancho),
            f"TOTAL FACTURA (VES):  Bs. {total_ves:>10.2f}".rjust(ancho),
            linea_doble,
            f"FORMA DE PAGO:  {metodo_pago}",
            f"MONTO RECIBIDO: \${monto_pagado:>9.2f} (Bs. {monto_pagado * tasa_bcv:>9.2f})",
            f"CAMBIO / VUELTO:\${cambio:>9.2f} (Bs. {cambio * tasa_bcv:>9.2f})",
            linea_simple,
            "Leyenda LISLR Art. 177 / Prov. 00071".center(ancho),
            "Conserve esta factura para reclamos".center(ancho),
            "SISTEMA FISCAL ADAPTADO A VENEZUELA".center(ancho),
            linea_doble,
            "\\n\\n\\n"
        ])

        return "\\n".join(lines)

    def print_or_show_ticket(self, ticket_text, folio):
        """Guarda en archivo temporal y abre el spooler o bloc de notas en Windows."""
        try:
            temp_dir = tempfile.gettempdir()
            file_path = os.path.join(temp_dir, f"factura_fiscal_{folio}.txt")

            with open(file_path, "w", encoding="utf-8") as f:
                f.write(ticket_text)

            if sys.platform.startswith("win"):
                os.startfile(file_path)
            else:
                print("Factura fiscal generada en:", file_path)
        except Exception as e:
            print("Error al imprimir factura fiscal:", e)
`
  },
  {
    name: "bcv_service.py",
    description: "Servicio de consulta oficial del BCV (Directo bcv.org.ve, DolarApi & OpenExchange)",
    path: "bcv_service.py",
    language: "python",
    content: `"""
=============================================================================
MÓDULO DE COTIZACIÓN OFICIAL DEL BANCO CENTRAL DE VENEZUELA (BCV)
=============================================================================
Consulta la cotización oficial del BCV para dólares (USD) y euros (EUR):
1. Fuente primaria oficial directa: Web del BCV (https://www.bcv.org.ve)
   - Extrae la tasa del dólar, euro y la "Fecha Valor" oficial (incluso tasas publicadas
     los viernes por la tarde para el fin de semana o siguiente día hábil).
2. Fuente secundaria de respaldo: DolarApi (ve.dolarapi.com/v1/dolares/oficial)
3. Fuente de contingencia: Open Exchange Rates (open.er-api.com/v6/latest/USD)
"""

import json
import re
import ssl
import urllib.request
import urllib.error
from datetime import datetime


def get_bcv_rates():
    """
    Obtiene las tasas oficiales del BCV en Bolívares (VES).
    Retorna un diccionario con:
    {
        'success': True,
        'source': 'BCV Oficial Directo (bcv.org.ve)' | 'BCV Oficial (ve.dolarapi.com)',
        'usd': float,
        'eur': float | None,
        'fecha_valor': str,
        'updated_at': str
    }
    """
    # 1. Intentar directamente con la web oficial del Banco Central de Venezuela
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        req = urllib.request.Request(
            "https://www.bcv.org.ve",
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "es-VE,es;q=0.9,en;q=0.8"
            }
        )
        with urllib.request.urlopen(req, context=ctx, timeout=9) as response:
            html = response.read().decode("utf-8", errors="ignore")
            
            dolar_match = re.search(r'id="dolar"[\s\S]*?<strong[^>]*>([\s\S]*?)</strong>', html, re.IGNORECASE)
            euro_match = re.search(r'id="euro"[\s\S]*?<strong[^>]*>([\s\S]*?)</strong>', html, re.IGNORECASE)
            fecha_match = re.search(r'Fecha Valor:[\s\S]*?<span[^>]*>([\s\S]*?)</span>', html, re.IGNORECASE)

            if dolar_match:
                dolar_str = re.sub(r'<[^>]*>', '', dolar_match.group(1)).strip().replace('.', '').replace(',', '.')
                usd_val = float(dolar_str)

                eur_val = None
                if euro_match:
                    eur_str = re.sub(r'<[^>]*>', '', euro_match.group(1)).strip().replace('.', '').replace(',', '.')
                    try:
                        eur_val = float(eur_str)
                    except ValueError:
                        eur_val = None

                fecha_valor = ""
                if fecha_match:
                    fecha_valor = re.sub(r'<[^>]*>', '', fecha_match.group(1)).strip()
                    fecha_valor = re.sub(r'\s+', ' ', fecha_valor)

                if usd_val > 0:
                    return {
                        "success": True,
                        "source": "BCV Oficial Directo (bcv.org.ve)",
                        "usd": usd_val,
                        "eur": eur_val,
                        "fecha_valor": fecha_valor,
                        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
    except Exception as direct_err:
        print(f"Aviso: Consulta directa a bcv.org.ve falló ({direct_err}), intentando DolarApi...")

    # 2. Respaldo secundario: DolarApi (Oficial BCV)
    try:
        req_usd = urllib.request.Request(
            f"https://ve.dolarapi.com/v1/dolares/oficial?_t={int(datetime.now().timestamp())}",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req_usd, timeout=8) as response:
            if response.status == 200:
                usd_data = json.loads(response.read().decode("utf-8"))
                
                # Intentar EUR
                eur_rate = None
                try:
                    req_eur = urllib.request.Request(
                        f"https://ve.dolarapi.com/v1/euros/oficial?_t={int(datetime.now().timestamp())}",
                        headers={"User-Agent": "Mozilla/5.0"}
                    )
                    with urllib.request.urlopen(req_eur, timeout=5) as eur_response:
                        if eur_response.status == 200:
                            eur_data = json.loads(eur_response.read().decode("utf-8"))
                            eur_rate = float(eur_data.get("promedio", 0))
                except Exception:
                    pass

                return {
                    "success": True,
                    "source": "BCV Oficial (ve.dolarapi.com)",
                    "usd": float(usd_data.get("promedio", 36.5)),
                    "eur": eur_rate,
                    "fecha_valor": str(usd_data.get("fechaActualizacion", "")),
                    "updated_at": str(usd_data.get("fechaActualizacion", ""))
                }
    except Exception as error:
        print(f"Fallo fuente DolarApi, intentando respaldo OpenExchange... {error}")

    # 3. Fallback de respaldo (open.er-api.com)
    try:
        req_fallback = urllib.request.Request(
            "https://open.er-api.com/v6/latest/USD",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req_fallback, timeout=8) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                rates = data.get("rates", {})
                ves_rate = rates.get("VES")
                if ves_rate:
                    return {
                        "success": True,
                        "source": "Open Exchange Rates (BCV)",
                        "usd": float(ves_rate),
                        "eur": None,
                        "fecha_valor": "",
                        "updated_at": str(data.get("time_last_update_utc", ""))
                    }
    except Exception as fallback_error:
        print(f"Error al obtener cotizaciones BCV: {fallback_error}")

    raise RuntimeError("No se pudo obtener la cotización del BCV en ninguna fuente.")


if __name__ == "__main__":
    print("Consultando cotización oficial del BCV...")
    try:
        rates = get_bcv_rates()
        print(f"Fuente: {rates['source']}")
        print(f"Tasa USD: Bs. {rates['usd']:.2f}")
        if rates['eur']:
            print(f"Tasa EUR: Bs. {rates['eur']:.2f}")
        if rates.get('fecha_valor'):
            print(f"Fecha Valor: {rates['fecha_valor']}")
        print(f"Actualizado: {rates['updated_at']}")
    except Exception as e:
        print(f"Error: {e}")
`
  },
  {
    name: "requirements.txt",
    description: "Dependencias de Python necesarias para ejecutar en Windows",
    path: "requirements.txt",
    language: "text",
    content: `customtkinter>=5.2.2
google-genai>=1.0.0
pillow>=10.0.0
reportlab>=4.0.0
python-dotenv>=1.0.0
`
  },
  {
    name: "run.bat",
    description: "Script batch para iniciar la aplicación en Windows con 1 solo clic",
    path: "run.bat",
    language: "bat",
    content: `@echo off
title Sistema de Inventario & POS con CustomTkinter y Gemini
color 0b
echo =========================================================================
echo    SISTEMA DE INVENTARIO Y POS - CUSTOMTKINTER & GEMINI AI
echo =========================================================================
echo.

REM Verificar si Python esta instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no se encuentra en el PATH del sistema.
    echo Por favor descargue e instale Python desde https://www.python.org/
    echo Asegurese de marcar la casilla "Add Python to PATH".
    pause
    exit /b
)

REM Crear entorno virtual si no existe
if not exist "venv" (
    echo [1/3] Creando entorno virtual 'venv'...
    python -m venv venv
)

REM Activar entorno virtual
echo [2/3] Activando entorno virtual...
call venv\\Scripts\\activate.bat

REM Instalar dependencias
echo [3/3] Instalando / verificando dependencias...
pip install -r requirements.txt --quiet

echo.
echo Iniciando aplicacion de inventario...
python main.py

pause
`
  },
  {
    name: "README.md",
    description: "Instrucciones de instalación y ejecución en Windows 10/11",
    path: "README.md",
    language: "markdown",
    content: `# Sistema de Inventario Local & POS para Windows
### Desarrollado en Python con CustomTkinter, SQLite y Google Gemini AI

Un sistema integral de escritorio para Windows diseñado para operar **100% en local** con base de datos SQLite y funcionalidad híbrida de inteligencia artificial para digitalización de facturas de proveedores.

---

## 🚀 Características Principales

1. **Base de Datos SQLite Local (\`inventario.db\`):**
   - Tablas relacionales con integridad referencial: \`productos\`, \`categorias\`, \`movimientos\` (Kardex de entradas, salidas y ajustes) y \`ventas\` / \`detalle_ventas\`.
   - Transacciones atómicas seguras: al cobrar una venta se descuenta el stock, se genera la venta y se asienta el movimiento en el Kardex.

2. **Interfaz Gráfica Moderna con CustomTkinter:**
   - Modo oscuro y modo claro con estética nativa de Windows 11.
   - Pestaña **Inventario:** búsqueda rápida en tiempo real, filtro por categoría, alertas de stock mínimo y agotado, altas, bajas, modificaciones y ajuste rápido de stock.
   - Pestaña **Punto de Venta (POS):** lectura de código de barras o búsqueda por nombre, carrito interactivo, cálculo de cambio en tiempo real y emisión de tickets térmicos formateados para impresoras de 58mm y 80mm.
   - Pestaña **Registro de Movimientos:** historial completo de entradas y salidas para auditoría y control de mermas, con exportación a archivo CSV.

3. **Módulo de Facturas con Google Gemini AI (\`google-genai\` SDK):**
   - Carga una foto o escaneo de la factura de un proveedor.
   - El modelo \`gemini-3.8-flash\` extrae automáticamente el nombre del proveedor, folio y todos los renglones de productos (nombre, cantidad, costo unitario y margen de venta sugerido).
   - Permite revisar y dar de alta todos los productos a la base de datos con 1 solo clic registrando el movimiento de \`ENTRADA\`.

4. **Funcionamiento Híbrido Offline:**
   - Si no hay conexión a internet o no se ha configurado la API Key de Gemini, las funciones de Punto de Venta, inventario, stock y movimientos continúan operando al **100% de manera local** sin ninguna interrupción.

---

## 🛠️ Instalación en Windows

### Paso 1: Clonar o descargar los archivos
Coloca los archivos en una carpeta (por ejemplo \`C:\\Inventario\`):
- \`main.py\`
- \`database.py\`
- \`gemini_extractor.py\`
- \`ticket_printer.py\`
- \`requirements.txt\`
- \`run.bat\`

### Paso 2: Configurar la clave de Gemini (Opcional)
Crea un archivo llamado \`.env\` en la misma carpeta con tu API Key de Google Gemini:
\`\`\`env
GEMINI_API_KEY=tu_api_key_aqui
\`\`\`
*(Si no colocas la clave, el sistema funcionará en modo local híbrido normalmente).*

### Paso 3: Ejecución con 1 clic
Haz doble clic en el archivo **\`run.bat\`**.
El script creará automáticamente el entorno virtual, instalará las librerías necesarias y abrirá el sistema de inventario.

O desde la consola de Windows (CMD o PowerShell):
\`\`\`bash
python -m venv venv
venv\\Scripts\\activate
pip install -r requirements.txt
python main.py
\`\`\`
`
  },
  {
    name: "license_manager.py",
    description: "Módulo de Control de Licencias Remotas y Suscripciones Mensuales (Método 1)",
    path: "license_manager.py",
    language: "python",
    content: `import json
import os
import urllib.request
from datetime import datetime, timedelta

MASTER_UNLOCK_CODE = "FISCAL-ADMIN-2552"
SOPORTE_WHATSAPP = "+584129264885"
PAGO_MOVIL_BANCO = "Banesco (0134)"
PAGO_MOVIL_TELF = "04129264885"
PAGO_MOVIL_CI = "30988249"
CONFIG_FILE = "license.json"
# Enlace CSV directo de tu Google Sheet (ID: 1mR0Me2ulMjOwmI3meUPtrhFYPUvvlYADTQBDauG2sFE)
REMOTE_ENDPOINT_URL = "https://docs.google.com/spreadsheets/d/1mR0Me2ulMjOwmI3meUPtrhFYPUvvlYADTQBDauG2sFE/export?format=csv"

class LicenseManager:
    def __init__(self, cliente_id="BDG-2026-7492-VE", edition="bodega"):
        self.cliente_id = cliente_id
        self.edition = edition
        self.cuota_mensual = 15.0 if edition == "bodega" else 30.0
        self.license_data = self.load_local_license()
        # Sincronizar automáticamente con tu Google Sheets al iniciar
        self.sync_remote_license()

    def sync_remote_license(self):
        """Descarga silenciosamente el estado desde tu Google Sheets."""
        import csv
        try:
            req = urllib.request.Request(
                REMOTE_ENDPOINT_URL,
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=4) as response:
                lines = [line.decode('utf-8') for line in response.readlines()]
                reader = csv.DictReader(lines)
                for row in reader:
                    # Busca la fila que coincida con el cliente_id de esta máquina
                    if row.get('cliente_id', '').strip() == self.cliente_id:
                        self.license_data['estado_remoto'] = row.get('estado', 'ACTIVO').strip().upper()
                        self.license_data['fecha_vencimiento'] = row.get('fecha_vencimiento', self.license_data.get('fecha_vencimiento')).strip()
                        if 'cuota_usd' in row and row['cuota_usd'].strip():
                            try:
                                self.license_data['cuota_mensual_usd'] = float(row['cuota_usd'])
                            except ValueError:
                                pass
                        self.license_data['ultimo_contacto'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        self.save_local_license(self.license_data)
                        return True
        except Exception as e:
            # Si no hay internet, continúa trabajando con el archivo local
            print(f"[Licencia Offline] No se pudo contactar con Google Sheets: {e}")
        return False

    def load_local_license(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        
        today = datetime.now()
        exp_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")
        default_data = {
            "cliente_id": self.cliente_id,
            "edition": self.edition,
            "fecha_vencimiento": exp_date,
            "estado_remoto": "ACTIVO",
            "ultimo_contacto": today.strftime("%Y-%m-%d %H:%M:%S"),
            "dias_gracia": 3
        }
        self.save_local_license(default_data)
        return default_data

    def save_local_license(self, data):
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4)
        except Exception as e:
            print(f"Error guardando licencia: {e}")

    def validate_access(self):
        if self.license_data.get("estado_remoto") == "SUSPENDIDO":
            return False, "Servicio Suspendido por Administración por Mensualidad Pendiente.", 0

        fecha_exp_str = self.license_data.get("fecha_vencimiento", "2000-01-01")
        try:
            fecha_exp = datetime.strptime(fecha_exp_str, "%Y-%m-%d")
            hoy = datetime.now()
            dias_restantes = (fecha_exp - hoy).days

            if dias_restantes < 0:
                return False, f"Su mensualidad venció hace {abs(dias_restantes)} días.", dias_restantes

            return True, "Licencia activa", dias_restantes
        except Exception as e:
            return False, str(e), 0

    def renew_subscription(self, days=30):
        hoy = datetime.now()
        nueva_fecha = (hoy + timedelta(days=days)).strftime("%Y-%m-%d")
        self.license_data["fecha_vencimiento"] = nueva_fecha
        self.license_data["estado_remoto"] = "ACTIVO"
        self.save_local_license(self.license_data)
        return nueva_fecha

    def unlock_with_master_code(self, code):
        if code.strip().upper() == MASTER_UNLOCK_CODE:
            return self.renew_subscription(30)
        return False
`
  },
  {
    name: "INSTALAR_CLIENTE_WINDOWS.bat",
    description: "Script de instalación automática en 1 clic para la computadora del cliente en Windows",
    path: "INSTALAR_CLIENTE_WINDOWS.bat",
    language: "bat",
    content: `@echo off
title Instalador Automatico - Sistema POS y Facturacion Venezuela
color 0b
echo =========================================================================
echo       INSTALADOR AUTOMATICO PARA CLIENTES - SISTEMA POS VENEZUELA
echo =========================================================================
echo.
echo [1/3] Comprobando instalacion de Python en Windows...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0c
    echo [ALERTA] Python no se encuentra en el sistema o no esta en el PATH.
    echo Por favor descargue e instale Python 3.11 o superior desde:
    echo https://www.python.org/downloads/
    echo Recuerde marcar: "[X] Add Python to PATH"
    echo.
    pause
    exit /b
)
python --version
echo [OK] Python detectado correctamente.
echo.
echo [2/3] Instalando dependencias de interfaz y librerias (CustomTkinter, Pillow, etc.)...
python -m pip install --upgrade pip
pip install -r requirements.txt
echo [OK] Todas las dependencias quedaron instaladas.
echo.
echo [3/3] Iniciando el Sistema POS con su icono oficial...
echo =========================================================================
echo       SISTEMA LISTO PARA TRABAJAR EN CAJA
echo =========================================================================
echo.
start "" pythonw main.py
exit
`
  },
  {
    name: "INICIAR_SISTEMA.bat",
    description: "Acceso directo para abrir el sistema con doble clic en Windows sin mostrar consola",
    path: "INICIAR_SISTEMA.bat",
    language: "bat",
    content: `@echo off
start "" pythonw main.py
exit
`
  },
  {
    name: "CREAR_EJECUTABLE_EXE.bat",
    description: "Script para empaquetar el sistema en un solo archivo ejecutable (.exe) con el icono 3D oficial",
    path: "CREAR_EJECUTABLE_EXE.bat",
    language: "bat",
    content: `@echo off
title Generador de Ejecutable Windows (.exe) - Sistema POS
echo =========================================================================
echo     COMPILADOR A ARCHIVO EJECUTABLE (.EXE) INDEPENDIENTE
echo =========================================================================
echo.
echo 1. Verificando PyInstaller...
pip install pyinstaller
echo.
echo 2. Empaquetando main.py con el icono oficial app_icon.ico...
pyinstaller --noconsole --onefile --icon=app_icon.ico --name="Sistema_POS_Venezuela" main.py
echo.
echo =========================================================================
echo     COMPILACION EXITOSA!
echo     El programa ejecutable se encuentra en la carpeta "dist/Sistema_POS_Venezuela.exe"
echo     Puede copiarlo al escritorio del cliente para su uso diario.
echo =========================================================================
pause
`
  },
  {
    name: "CONFIGURACION_NEGOCIO.json",
    description: "Archivo de configuración con los datos comerciales del cliente para tickets y reportes",
    path: "CONFIGURACION_NEGOCIO.json",
    language: "json",
    content: `{
  "nombre_comercial": "Inversiones y Víveres Don Pedro",
  "razon_social": "INVERSIONES Y VÍVERES DON PEDRO, C.A.",
  "rif": "J-40918274-1",
  "direccion": "Av. Principal con Calle 4, Local N° 12, Casco Central",
  "telefono": "+58 412-5551234",
  "whatsapp_cobros": "+58 412-5551234",
  "pie_ticket": "¡Gracias por su preferencia! Conserve este comprobante para cualquier reclamo en 48h.",
  "moneda_defecto": "USD",
  "alicuota_iva": 16,
  "alicuota_igtf": 3,
  "caja": "Caja 01",
  "tasa_bcv_referencia": 36.50
}
`
  },
  {
    name: "MANUAL_DE_USUARIO_CLIENTE.txt",
    description: "Manual de instrucciones rápidas en texto plano para el cliente y los cajeros",
    path: "MANUAL_DE_USUARIO_CLIENTE.txt",
    language: "text",
    content: `=============================================================================
         MANUAL DE OPERACIONES Y GUÍA DEL CAJERO - SISTEMA POS VENEZUELA
=============================================================================

1. INICIO RÁPIDO EN WINDOWS
-----------------------------------------------------------------------------
- Para la primera vez: Haga doble clic en "INSTALAR_CLIENTE_WINDOWS.bat".
- Para el uso diario: Haga doble clic en "INICIAR_SISTEMA.bat" o en el acceso
  directo del Escritorio.
- La base de datos es local e independiente ("inventario.db"). Funciona 100%
  offline aunque no haya señal de internet en el establecimiento.

2. CÓMO COBRAR UNA VENTA EN CAJA
-----------------------------------------------------------------------------
a) Escanear productos:
   Pase el lector láser por el código de barras o escriba el nombre en el
   buscador y presione Enter.
b) Cobro en Dólares en Efectivo ($):
   Indique el billete que le entrega el cliente ($10, $20, etc.). El sistema
   calcula de forma automática el vuelto exacto en Bolívares al cambio oficial
   del día del BCV.
c) Cobro en Bolívares (Pago Móvil / Punto de Venta):
   El sistema muestra el total en Bs. Solicite la referencia bancaria y
   asótela en la pantalla para la conciliación.
d) Impresión:
   Al confirmar, la gaveta de dinero se abre y la impresora térmica emite
   el ticket con el nombre, RIF y datos de su negocio.

3. TASA OFICIAL DEL BANCO CENTRAL DE VENEZUELA (BCV)
-----------------------------------------------------------------------------
- Con internet: Se actualiza sola diariamente desde la fuente oficial.
- Sin internet o por fecha valor: Haga clic en el lápiz al lado de la tasa
  en la barra superior, escriba el nuevo monto en Bs. y presione Guardar.

4. ARQUEO Y CIERRE DE TURNO (CIERRE Z)
-----------------------------------------------------------------------------
- Al terminar la jornada, vaya al menú "Cierre de Turno / Arqueo".
- Ingrese el conteo físico de billetes en $, efectivo en Bs, lotes del punto
  de venta y pagos móviles.
- El sistema emitirá el diagnóstico (CUADRADA, FALTANTE o SOBRANTE) y el
  comprobante para archivar.

5. COPIA DE SEGURIDAD (RESPALDO EN PENDRIVE)
-----------------------------------------------------------------------------
- Conecte una memoria USB / Pendrive a la computadora.
- En el menú superior presione "Respaldos" -> "Exportar Copia Completa".
- Guarde el archivo en el pendrive para proteger su inventario ante cualquier
  falla eléctrica.
=============================================================================
`
  }
];

