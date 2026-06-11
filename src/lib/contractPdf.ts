interface PdfItem {
    name: string;
    unit: string;
    quantity: number;
    price: number;
}

interface PdfData {
    fullName: string;
    address: string;
    totalAmount: number | string;
    advance: number | string;
    deliverySchedule: string;
    today: string;
    items: PdfItem[];
}

function getLastName(fullName: string): string {
    return fullName.trim().split(/\s+/)[0] || "Договор";
}

export function buildContractPrintHtml(data: PdfData): string {
    const { fullName, address, totalAmount, advance, deliverySchedule, today, items } = data;

    const dataRows = items
        .map(
            (item, i) =>
                "<tr>" +
                "<td>" + (i + 1) + "</td>" +
                "<td>" + item.name + "</td>" +
                "<td>" + item.unit + "</td>" +
                "<td>" + item.quantity + "</td>" +
                "<td>" + item.price + "</td>" +
                "<td>" + item.quantity * item.price + "</td>" +
                "</tr>"
        )
        .join("");

    const emptyCount = Math.max(0, 8 - items.length);
    const emptyRows = Array.from(
        { length: emptyCount },
        (_, i) =>
            "<tr>" +
            "<td>" + (items.length + i + 1) + "</td>" +
            "<td></td><td></td><td></td><td></td><td></td>" +
            "</tr>"
    ).join("");

    return (
        "<!DOCTYPE html>" +
        '<html lang="ru">' +
        "<head>" +
        '<meta charset="UTF-8">' +
        "<title>ДОГОВОР " + getLastName(fullName) + "</title>" +
        "<style>" +
        "* { box-sizing: border-box; margin: 0; padding: 0; }" +
        'body { font-family: "Times New Roman", Times, serif; font-size: 12pt; color: #000; padding: 20mm 20mm 20mm 30mm; }' +
        ".right { text-align: right; margin-bottom: 8mm; }" +
        ".right p { line-height: 1.6; }" +
        "h2 { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 6mm; letter-spacing: 2px; }" +
        "table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }" +
        "th, td { border: 1px solid #000; padding: 3mm 2mm; vertical-align: middle; font-size: 11pt; }" +
        "th { text-align: center; font-weight: bold; }" +
        "td:first-child { text-align: center; width: 8mm; }" +
        "td:nth-child(3), td:nth-child(4), td:nth-child(5), td:nth-child(6) { text-align: center; }" +
        ".total-line { margin-bottom: 5mm; font-size: 12pt; }" +
        ".section-title { font-weight: bold; text-decoration: underline; margin-bottom: 2mm; margin-top: 5mm; }" +
        ".section-body p { margin-bottom: 2mm; font-size: 11pt; line-height: 1.5; }" +
        "@media print { @page { size: A4; margin: 20mm 20mm 20mm 30mm; } body { padding: 0; } }" +
        "</style>" +
        "</head>" +
        "<body>" +
        '<div class="right">' +
        "<p><strong>Приложение №1</strong></p>" +
        "<p>к Договору поставки от " + today + "</p>" +
        "</div>" +
        "<h2>СПЕЦИФИКАЦИЯ</h2>" +
        "<table>" +
        "<thead>" +
        "<tr>" +
        "<th>№</th>" +
        "<th>Наименование</th>" +
        "<th>Ед. изм.</th>" +
        "<th>Кол-во</th>" +
        "<th>Цена, руб.</th>" +
        "<th>Итого, руб.</th>" +
        "</tr>" +
        "</thead>" +
        "<tbody>" +
        dataRows +
        emptyRows +
        "</tbody>" +
        "</table>" +
        '<p class="total-line">Итоговая стоимость Спецификации составляет <strong>' + totalAmount + "</strong> рублей.</p>" +
        '<div class="section-title">Условия поставки:</div>' +
        '<div class="section-body">' +
        "<p>2.5. Цена указана за наличный расчет, НДС не облагается. Поставщик осуществляет отгрузку Товара до объекта, расположенного по адресу: " + address + ".</p>" +
        "<p>2.6. Авансовый платеж в размере " + advance + " рублей производится Покупателем в течение суток.</p>" +
        "<p>2.7. График поставки: " + deliverySchedule + ".</p>" +
        "</div>" +
        '<div class="section-title">Технические характеристики:</div>' +
        '<div class="section-body">' +
        "<p>* марка бетона по прочности при сжатии - 400 кг/см²</p>" +
        "<p>* морозоустойчивость - F300 (300 циклов замораживания и оттаивания без потери прочности)</p>" +
        "<p>* метод изготовления - вибропрессование</p>" +
        "<p>* марка бетона готовой продукции из цемента - М400</p>" +
        "<p>* марка бетона готовой продукции из белого портландцемента - М500</p>" +
        "</div>" +
        "</body>" +
        "</html>"
    );
}
