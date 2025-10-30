#!/usr/bin/env python3
"""Provision a Python virtual environment with Faster-Whisper dependencies."""

import argparse
import os
import subprocess
import sys
import venv

REQUIREMENTS_FILE = os.path.join('python-bridge', 'requirements.txt')
FALLBACK_REQUIREMENTS = [
    "faster-whisper==1.0.3",
]


def run(cmd, env=None):
    print(f"[setup-faster-whisper] $ {' '.join(cmd)}")
    try:
        subprocess.check_call(cmd, env=env)
    except subprocess.CalledProcessError as error:
        raise RuntimeError(f"command failed with exit code {error.returncode}") from error


def ensure_venv(path: str):
    if not os.path.isdir('python-bridge'):
        raise RuntimeError('python-bridge directory missing. Run from repo root.')
    builder = venv.EnvBuilder(with_pip=True)
    if not os.path.exists(path):
        print(f"[setup-faster-whisper] creating virtualenv at {path}")
        try:
            builder.create(path)
        except Exception as error:  # pylint: disable=broad-except
            raise RuntimeError('failed to create virtualenv; ensure Python 3.8+ is installed') from error
    return path


def install_dependencies(venv_path: str):
    bin_dir = 'Scripts' if os.name == 'nt' else 'bin'
    python_bin = os.path.join(venv_path, bin_dir, 'python.exe' if os.name == 'nt' else 'python')
    pip_bin = os.path.join(venv_path, bin_dir, 'pip.exe' if os.name == 'nt' else 'pip')

    if not os.path.exists(pip_bin):
        raise RuntimeError('pip not found in virtualenv, ensure Python 3.8+ is installed')

    run([pip_bin, 'install', '--upgrade', 'pip'])

    if os.path.exists(REQUIREMENTS_FILE):
        run([pip_bin, 'install', '-r', REQUIREMENTS_FILE])
    else:
        run([pip_bin, 'install', *FALLBACK_REQUIREMENTS])
    print('[setup-faster-whisper] dependencies installed successfully')

    return python_bin


def main():
    parser = argparse.ArgumentParser(description='Configure Faster-Whisper virtual environment')
    parser.add_argument('--venv', default=os.path.join('python-bridge', 'venv'), help='Target virtualenv directory')
    args = parser.parse_args()

    venv_path = ensure_venv(args.venv)
    python_bin = install_dependencies(venv_path)

    print('\n[setup-faster-whisper] Setup complete!')
    print(f"Activate the environment with: source {os.path.join(venv_path, 'bin', 'activate')}")
    print('Then launch the bridge server via python-bridge/faster_whisper_server.py')
    print(f"Example: {python_bin} python-bridge/faster_whisper_server.py --port 8765")


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:  # pylint: disable=broad-except
        print('[setup-faster-whisper] error:', exc, file=sys.stderr)
        sys.exit(1)
