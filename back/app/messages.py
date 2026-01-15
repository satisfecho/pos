"""
Message translations for API responses and errors.
"""

MESSAGES = {
    "en": {
        "database_error": "Database error",
        "email_already_registered": "Email already registered",
        "incorrect_username_or_password": "Incorrect username or password",
        "invalid_entity_type": "Invalid entity type. Allowed: {allowed}",
        "access_denied": "Access denied",
        "product_not_found": "Product not found",
        "tenant_not_found": "Tenant not found",
        "invalid_currency_code": "currency_code must be a 3-letter ISO code (e.g. EUR)",
        "invalid_file_type": "Invalid file type. Allowed: {allowed}",
        "file_too_large": "File too large. Max size: {max_size}MB",
        "provider_not_found": "Provider not found",
        "catalog_item_not_found": "Catalog item not found",
        "provider_product_not_found": "Provider product not found or doesn't match catalog",
        "price_required": "Price is required",
        "tenant_product_not_found": "Tenant product not found",
        "floor_not_found": "Floor not found",
        "table_not_found": "Table not found",
        "order_not_found": "Order not found",
        "invalid_table": "Invalid table",
        "order_has_no_items": "Order has no items",
        "stripe_not_configured": "Stripe not configured for this tenant",
        "payment_not_completed": "Payment not completed",
        "order_must_have_at_least_one_item": "Order must have at least one item",
    },
    "es": {
        "database_error": "Error de base de datos",
        "email_already_registered": "Correo electrónico ya registrado",
        "incorrect_username_or_password": "Nombre de usuario o contraseña incorrectos",
        "invalid_entity_type": "Tipo de entidad inválido. Permitido: {allowed}",
        "access_denied": "Acceso denegado",
        "product_not_found": "Producto no encontrado",
        "tenant_not_found": "Inquilino no encontrado",
        "invalid_currency_code": "El código de moneda debe ser un código ISO de 3 letras (ej. EUR)",
        "invalid_file_type": "Tipo de archivo inválido. Permitido: {allowed}",
        "file_too_large": "Archivo demasiado grande. Tamaño máximo: {max_size}MB",
        "provider_not_found": "Proveedor no encontrado",
        "catalog_item_not_found": "Artículo del catálogo no encontrado",
        "provider_product_not_found": "Producto del proveedor no encontrado o no coincide con el catálogo",
        "price_required": "El precio es obligatorio",
        "tenant_product_not_found": "Producto del inquilino no encontrado",
        "floor_not_found": "Planta no encontrada",
        "table_not_found": "Mesa no encontrada",
        "order_not_found": "Pedido no encontrado",
        "invalid_table": "Mesa inválida",
        "order_has_no_items": "El pedido no tiene artículos",
        "stripe_not_configured": "Stripe no configurado para este inquilino",
        "payment_not_completed": "Pago no completado",
        "order_must_have_at_least_one_item": "El pedido debe tener al menos un artículo",
    },
    "ca": {
        "database_error": "Error de base de dades",
        "email_already_registered": "Correu electrònic ja registrat",
        "incorrect_username_or_password": "Nom d'usuari o contrasenya incorrectes",
        "invalid_entity_type": "Tipus d'entitat invàlid. Permès: {allowed}",
        "access_denied": "Accés denegat",
        "product_not_found": "Producte no trobat",
        "tenant_not_found": "Llogater no trobat",
        "invalid_currency_code": "El codi de moneda ha de ser un codi ISO de 3 lletres (ex. EUR)",
        "invalid_file_type": "Tipus de fitxer invàlid. Permès: {allowed}",
        "file_too_large": "Fitxer massa gran. Mida màxima: {max_size}MB",
        "provider_not_found": "Proveïdor no trobat",
        "catalog_item_not_found": "Article del catàleg no trobat",
        "provider_product_not_found": "Producte del proveïdor no trobat o no coincideix amb el catàleg",
        "price_required": "El preu és obligatori",
        "tenant_product_not_found": "Producte del llogater no trobat",
        "floor_not_found": "Planta no trobada",
        "table_not_found": "Taula no trobada",
        "order_not_found": "Comanda no trobada",
        "invalid_table": "Taula invàlida",
        "order_has_no_items": "La comanda no té articles",
        "stripe_not_configured": "Stripe no configurat per aquest llogater",
        "payment_not_completed": "Pagament no completat",
        "order_must_have_at_least_one_item": "La comanda ha de tenir almenys un article",
    },
    "de": {
        "database_error": "Datenbankfehler",
        "email_already_registered": "E-Mail bereits registriert",
        "incorrect_username_or_password": "Falscher Benutzername oder Passwort",
        "invalid_entity_type": "Ungültiger Entitätstyp. Erlaubt: {allowed}",
        "access_denied": "Zugriff verweigert",
        "product_not_found": "Produkt nicht gefunden",
        "tenant_not_found": "Mandant nicht gefunden",
        "invalid_currency_code": "Währungscode muss ein 3-stelliger ISO-Code sein (z.B. EUR)",
        "invalid_file_type": "Ungültiger Dateityp. Erlaubt: {allowed}",
        "file_too_large": "Datei zu groß. Maximale Größe: {max_size}MB",
        "provider_not_found": "Anbieter nicht gefunden",
        "catalog_item_not_found": "Katalogartikel nicht gefunden",
        "provider_product_not_found": "Anbieterprodukt nicht gefunden oder stimmt nicht mit Katalog überein",
        "price_required": "Preis ist erforderlich",
        "tenant_product_not_found": "Mandantenprodukt nicht gefunden",
        "floor_not_found": "Etage nicht gefunden",
        "table_not_found": "Tisch nicht gefunden",
        "order_not_found": "Bestellung nicht gefunden",
        "invalid_table": "Ungültiger Tisch",
        "order_has_no_items": "Bestellung hat keine Artikel",
        "stripe_not_configured": "Stripe nicht für diesen Mandanten konfiguriert",
        "payment_not_completed": "Zahlung nicht abgeschlossen",
        "order_must_have_at_least_one_item": "Bestellung muss mindestens einen Artikel haben",
    },
    "zh-CN": {
        "database_error": "数据库错误",
        "email_already_registered": "电子邮件已注册",
        "incorrect_username_or_password": "用户名或密码不正确",
        "invalid_entity_type": "无效的实体类型。允许：{allowed}",
        "access_denied": "访问被拒绝",
        "product_not_found": "未找到产品",
        "tenant_not_found": "未找到租户",
        "invalid_currency_code": "货币代码必须是3字母ISO代码（例如EUR）",
        "invalid_file_type": "无效的文件类型。允许：{allowed}",
        "file_too_large": "文件太大。最大大小：{max_size}MB",
        "provider_not_found": "未找到供应商",
        "catalog_item_not_found": "未找到目录项",
        "provider_product_not_found": "未找到供应商产品或与目录不匹配",
        "price_required": "需要价格",
        "tenant_product_not_found": "未找到租户产品",
        "floor_not_found": "未找到楼层",
        "table_not_found": "未找到桌子",
        "order_not_found": "未找到订单",
        "invalid_table": "无效的桌子",
        "order_has_no_items": "订单没有商品",
        "stripe_not_configured": "此租户未配置Stripe",
        "payment_not_completed": "付款未完成",
        "order_must_have_at_least_one_item": "订单必须至少有一个商品",
    },
    "hi": {
        "database_error": "डेटाबेस त्रुटि",
        "email_already_registered": "ईमेल पहले से पंजीकृत है",
        "incorrect_username_or_password": "गलत उपयोगकर्ता नाम या पासवर्ड",
        "invalid_entity_type": "अमान्य इकाई प्रकार। अनुमत: {allowed}",
        "access_denied": "पहुंच अस्वीकृत",
        "product_not_found": "उत्पाद नहीं मिला",
        "tenant_not_found": "किरायेदार नहीं मिला",
        "invalid_currency_code": "मुद्रा कोड 3-अक्षर ISO कोड होना चाहिए (जैसे EUR)",
        "invalid_file_type": "अमान्य फ़ाइल प्रकार। अनुमत: {allowed}",
        "file_too_large": "फ़ाइल बहुत बड़ी है। अधिकतम आकार: {max_size}MB",
        "provider_not_found": "प्रदाता नहीं मिला",
        "catalog_item_not_found": "कैटलॉग आइटम नहीं मिला",
        "provider_product_not_found": "प्रदाता उत्पाद नहीं मिला या कैटलॉग से मेल नहीं खाता",
        "price_required": "कीमत आवश्यक है",
        "tenant_product_not_found": "किरायेदार उत्पाद नहीं मिला",
        "floor_not_found": "मंजिल नहीं मिली",
        "table_not_found": "टेबल नहीं मिली",
        "order_not_found": "आदेश नहीं मिला",
        "invalid_table": "अमान्य टेबल",
        "order_has_no_items": "आदेश में कोई आइटम नहीं है",
        "stripe_not_configured": "इस किरायेदार के लिए स्ट्राइप कॉन्फ़िगर नहीं किया गया है",
        "payment_not_completed": "भुगतान पूरा नहीं हुआ",
        "order_must_have_at_least_one_item": "आदेश में कम से कम एक आइटम होना चाहिए",
    },
}


def get_message(key: str, lang: str = "en", **kwargs) -> str:
    """
    Get a translated message for the given key and language.

    Args:
        key: Message key
        lang: Language code
        **kwargs: Formatting arguments

    Returns:
        Translated and formatted message
    """
    messages = MESSAGES.get(lang, MESSAGES["en"])
    message = messages.get(key, MESSAGES["en"].get(key, key))

    if kwargs:
        try:
            message = message.format(**kwargs)
        except (KeyError, ValueError):
            pass  # Keep original message if formatting fails

    return message
