"""Serve the production build for concurrent Playwright asset requests."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class TestServer(ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


with TestServer(('127.0.0.1', 4321), partial(QuietHandler, directory='dist')) as server:
    server.serve_forever()
