from core.auth_utils import load_session_user


class HumanLinkSessionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.humanlink_user = load_session_user(request)
        return self.get_response(request)
