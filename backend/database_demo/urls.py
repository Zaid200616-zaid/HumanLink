from django.urls import path

from database_demo import views

app_name = "database_demo"

urlpatterns = [
    path("", views.index, name="index"),
    path("info/", views.info, name="info"),
    path("indexes/", views.indexes, name="indexes"),
    path("triggers/", views.triggers, name="triggers"),
    path("procedures/", views.procedures, name="procedures"),
    path("views/", views.db_views, name="views"),
    path("queries/", views.queries, name="queries"),
]
