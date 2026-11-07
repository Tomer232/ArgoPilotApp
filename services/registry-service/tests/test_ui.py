"""The demo dashboard at /ui."""


def test_ui_page_is_served(client):
    response = client.get("/ui")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "<title>AgroPilot Registry</title>" in response.text
