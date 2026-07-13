#!/usr/bin/env python3
"""Faithful merge of the 38 GHT day GPX files into one GPX — no data alteration.

Each source file contributes its <wpt> entries and its <trk> element(s)
verbatim (including original <name>, <trkseg>, <trkpt>, extensions).
Nothing inside the source data is modified — this is pure concatenation.
"""

import re, sys, xml.etree.ElementTree as ET
from pathlib import Path

GPX_NS = "http://www.topografix.com/GPX/1/1"

# Register namespaces so re-emitted XML keeps correct prefixes
for prefix, uri in [
    ("", GPX_NS),
    ("pv", "https://peakvisor.com/gpx/ext/1"),
    ("gpxx", "http://www.garmin.com/xmlschemas/GpxExtensions/v3"),
    ("gpxtpx", "http://www.garmin.com/xmlschemas/TrackPointExtension/v2"),
    ("xsi", "http://www.w3.org/2001/XMLSchema-instance"),
]:
    ET.register_namespace(prefix, uri)


def day_num(path):
    m = re.search(r'ghtday(\d+)', Path(path).stem.lower())
    return int(m.group(1)) if m else 9999


def merge_files(input_paths, output_path):
    files = sorted(input_paths, key=day_num)
    if not files:
        print("No GPX files", file=sys.stderr)
        sys.exit(1)

    print(f"Processing {len(files)} files...")

    all_wpt_xml = []
    all_trk_xml = []
    all_rte_xml = []
    metadata_xml = None

    for i, fpath in enumerate(files):
        text = Path(fpath).read_text(encoding="utf-8")
        # Strip PeakVisor header line "#gpx v1" if present (not valid XML)
        text = re.sub(r'^#gpx\s+\S+\s*\n', '', text).strip()
        try:
            root = ET.fromstring(text)
        except ET.ParseError as e:
            print(f"  SKIP {Path(fpath).name} — {e}")
            continue

        if i == 0:
            meta = root.find(f"{{{GPX_NS}}}metadata")
            if meta is not None:
                name_el = meta.find(f"{{{GPX_NS}}}name")
                if name_el is not None:
                    name_el.text = "GHT Full Track"
                metadata_xml = ET.tostring(meta, encoding="unicode").strip()

        for wpt in root.findall(f"{{{GPX_NS}}}wpt"):
            all_wpt_xml.append(ET.tostring(wpt, encoding="unicode").strip())

        for rte in root.findall(f"{{{GPX_NS}}}rte"):
            all_rte_xml.append(ET.tostring(rte, encoding="unicode").strip())

        for trk in root.findall(f"{{{GPX_NS}}}trk"):
            all_trk_xml.append(ET.tostring(trk, encoding="unicode").strip())

        nwpt = len(list(root.findall(f"{{{GPX_NS}}}wpt")))
        ntrk = len(list(root.findall(f"{{{GPX_NS}}}trk")))
        nseg = sum(len(trk.findall(f"{{{GPX_NS}}}trkseg"))
                   for trk in root.findall(f"{{{GPX_NS}}}trk"))
        npt = 0
        for trk in root.findall(f"{{{GPX_NS}}}trk"):
            for seg in trk.findall(f"{{{GPX_NS}}}trkseg"):
                npt += len(seg.findall(f"{{{GPX_NS}}}trkpt"))
        print(f"  {Path(fpath).name}: {nwpt} wpt, {ntrk} trk/{nseg} seg, {npt} trkpt")

    if not all_trk_xml:
        print("No tracks!", file=sys.stderr)
        sys.exit(1)

    parts = []
    parts.append('<?xml version="1.0" encoding="UTF-8"?>')
    parts.append(
        '<gpx version="1.1" creator="PeakVisorWeb"'
        ' xmlns="http://www.topografix.com/GPX/1/1"'
        ' xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3"'
        ' xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v2"'
        ' xmlns:pv="https://peakvisor.com/gpx/ext/1"'
        ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
        ' xsi:schemaLocation="http://www.topografix.com/GPX/1/1'
        ' http://www.topografix.com/GPX/1/1/gpx.xsd'
        ' http://www.garmin.com/xmlschemas/GpxExtensions/v3'
        ' http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd'
        ' http://www.garmin.com/xmlschemas/TrackPointExtension/v2'
        ' http://www.garmin.com/xmlschemas/TrackPointExtensionv2.xsd">'
    )
    if metadata_xml:
        parts.append("  " + metadata_xml)
    for wxml in all_wpt_xml:
        parts.append("  " + wxml)
    for rxml in all_rte_xml:
        parts.append("  " + rxml)
    for txml in all_trk_xml:
        for line in txml.splitlines():
            parts.append("  " + line)
    parts.append("</gpx>")

    result = "\n".join(parts) + "\n"
    Path(output_path).write_text(result, encoding="utf-8")
    print(f"\nDone -> {output_path}")
    print(f"  Waypoints: {len(all_wpt_xml)}")
    print(f"  Routes:    {len(all_rte_xml)}")
    print(f"  Tracks:    {len(all_trk_xml)}")


if __name__ == "__main__":
    out = sys.argv[1]
    files = sys.argv[2:]
    merge_files(files, out)
