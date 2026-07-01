from decimal import Decimal


CLASSIFICATION_ORDER = [
    "Xuất sắc",
    "Giỏi",
    "Khá",
    "TB Khá",
    "TB",
    "Yếu",
]


def classify_gpa(gpa) -> str:
    value = Decimal(str(gpa))
    if value >= Decimal("3.60"):
        return "Xuất sắc"
    if value >= Decimal("3.20"):
        return "Giỏi"
    if value >= Decimal("2.50"):
        return "Khá"
    if value >= Decimal("2.00"):
        return "TB Khá"
    if value >= Decimal("1.00"):
        return "TB"
    return "Yếu"


def build_summary(items):
    counts = {name: 0 for name in CLASSIFICATION_ORDER}
    total = len(items)
    for item in items:
        classification = item.get("classification")
        if classification in counts:
            counts[classification] += 1

    percentages = {
        name: round((counts[name] / total) * 100, 2) if total else 0.0
        for name in CLASSIFICATION_ORDER
    }
    return counts, percentages, total

