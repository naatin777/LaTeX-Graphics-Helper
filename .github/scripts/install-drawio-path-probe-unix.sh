#!/usr/bin/env bash
set -euo pipefail

version="30.0.4"
download_root="${RUNNER_TEMP:-/tmp}/lgh-drawio-download"
install_root="${RUNNER_TEMP:-/tmp}/lgh-drawio"
path_file="${RUNNER_TEMP:-/tmp}/lgh-drawio-path.txt"

mkdir -p "${download_root}" "${install_root}"

if [[ "$(uname -s)" == "Linux" ]]; then
	archive="${download_root}/drawio.deb"
	url="https://github.com/jgraph/drawio-desktop/releases/download/v${version}/drawio-amd64-${version}.deb"
	expected_sha256="c2da34d702e01855af9c9c60484cb9a4984b87f6811a195fcc5a2ff5b533033a"

	curl --fail --location --silent --show-error "${url}" --output "${archive}"
	echo "${expected_sha256}  ${archive}" | sha256sum --check
	sudo apt-get install -y "${archive}"

	drawio_path="$(command -v drawio)"
else
	case "$(uname -m)" in
		arm64)
			asset="draw.io-arm64-${version}.zip"
			expected_sha256="fd6b2770aa63063e9d62136add943e4f43f5aaef6a928f1fac55a8ec00d05586"
			;;
		x86_64)
			asset="draw.io-x64-${version}.zip"
			expected_sha256="bc9938ce8f415d77f987014a2ed5d9c1e711ac1247487ee7488f8ac505479801"
			;;
		*)
			echo "Unsupported macOS architecture: $(uname -m)" >&2
			exit 1
			;;
	esac

	archive="${download_root}/${asset}"
	url="https://github.com/jgraph/drawio-desktop/releases/download/v${version}/${asset}"
	curl --fail --location --silent --show-error "${url}" --output "${archive}"
	actual_sha256="$(shasum -a 256 "${archive}" | awk '{print $1}')"
	if [[ "${actual_sha256}" != "${expected_sha256}" ]]; then
		echo "draw.io archive SHA-256 mismatch: expected ${expected_sha256}, got ${actual_sha256}" >&2
		exit 1
	fi

	ditto -x -k "${archive}" "${install_root}"
	drawio_path="$(find "${install_root}" -type f -path '*/Contents/MacOS/draw.io' -print -quit)"
fi

if [[ -z "${drawio_path}" || ! -x "${drawio_path}" ]]; then
	echo "draw.io executable was not found: ${drawio_path}" >&2
	exit 1
fi

printf '%s' "${drawio_path}" >"${path_file}"
echo "draw.io path for probe: ${drawio_path}"
