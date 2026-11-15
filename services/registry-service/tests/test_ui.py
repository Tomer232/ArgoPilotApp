"""The demo dashboard at /ui."""


def test_ui_page_is_served(client):
    response = client.get("/ui")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "<title>AgroPilot Registry</title>" in response.text


def test_ui_opens_on_the_playground(client):
    page = client.get("/ui").text
    assert '<section class="view" data-view="playground">' in page  # the only view not hidden at load
    assert 'if (!VIEWS[name]) name = "playground";' in page
