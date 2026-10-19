import http.server
import socketserver
import os

PORT = 8080
DIRECTORY = r"D:\\"

class UploadHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_PUT(self):
        filename = os.path.basename(self.path)
        file_path = os.path.join(DIRECTORY, filename)
        content_length = int(self.headers.get('Content-Length', 0))

        try:
            with open(file_path, 'wb') as f:
                f.write(self.rfile.read(content_length))
            self.send_response(201)
            self.end_headers()
            self.wfile.write(b"File Uploaded Successfully to Pen Drive")
            print(f"✅ [PEN DRIVE SERVER] Saved new video/photo directly to Pen Drive D:\\ : {file_path}")
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            print(f"❌ [PEN DRIVE SERVER] Upload error: {e}")

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("0.0.0.0", PORT), UploadHandler) as httpd:
        print("==========================================================")
        print(f"🚀 Pen Drive HTTP Upload & Media Server LIVE at http://192.168.31.39:{PORT}")
        print(f"📁 Saving all app uploads directly into Pen Drive D:\\")
        print("==========================================================")
        httpd.serve_forever()
