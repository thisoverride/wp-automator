import socket
from concurrent.futures import ThreadPoolExecutor, as_completed

def check_port(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        result = s.connect_ex(('localhost', port))
        return port, result != 0

def check_ports_in_range(start, end, max_workers=100):
    available_ports = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_port = {executor.submit(check_port, port): port for port in range(start, end + 1)}
        for future in as_completed(future_to_port):
            port, is_available = future.result()
            if is_available:
                available_ports.append(port)
    return available_ports

if __name__ == '__main__':
    available_ports = check_ports_in_range(2000, 8100)
    print(available_ports)
