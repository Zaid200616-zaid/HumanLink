from django import template

register = template.Library()


@register.filter
def get_item(mapping, key):
    if mapping is None:
        return ""
    if isinstance(mapping, dict):
        return mapping.get(key, "")
    return getattr(mapping, key, "")
