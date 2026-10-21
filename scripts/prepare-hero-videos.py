"""Build the owner-selected, silent homepage loop. Requires an FFmpeg binary.

Usage: python3 scripts/prepare-hero-videos.py --source-dir /path/to/Video --ffmpeg /path/to/ffmpeg
The source files are read only; only optimized derivatives enter public/media.
"""
import argparse
import subprocess
import tempfile
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-dir', type=Path, required=True)
parser.add_argument('--ffmpeg', default='ffmpeg')
args = parser.parse_args()
output = Path(__file__).resolve().parents[1] / 'public/media'
output.mkdir(parents=True, exist_ok=True)
command = [args.ffmpeg, '-hide_banner', '-loglevel', 'warning', '-y']
# The final 0.8 seconds crossfade into the mountain opening. The loop restarts
# at that same point in the source, avoiding a hard cut between repetitions.
for start, duration, name in [(0.8, 6.4, 'asia-mountian.mp4'), (2, 8.8, 'green-waterfall.mp4'), (1, 8.8, 'vietnam.mp4'), (0, 0.8, 'asia-mountian.mp4')]:
    command += ['-ss', str(start), '-t', str(duration), '-i', str(args.source_dir / name)]
filters = [f'[{i}:v]fps=24,scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,format=yuv420p,settb=AVTB,setpts=PTS-STARTPTS[v{i}]' for i in range(4)]
filters += ['[v0][v1]xfade=transition=fade:duration=0.8:offset=5.6[x1]', '[x1][v2]xfade=transition=fade:duration=0.8:offset=13.6[x2]', '[x2][v3]xfade=transition=fade:duration=0.8:offset=21.6[out]']
with tempfile.TemporaryDirectory(prefix='waytoasia-hero-') as temp:
    master = str(Path(temp) / 'master.mp4')
    subprocess.run(command + ['-filter_complex', ';'.join(filters), '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-threads', '4', master], check=True)
    for name, transform, rate in [('desktop', 'scale=1280:720', '1400k'), ('mobile', 'crop=640:720,scale=576:648', '600k')]:
        subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'warning', '-y', '-i', master, '-vf', transform, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-maxrate', rate, '-bufsize', str(int(rate[:-1]) * 2) + 'k', '-pix_fmt', 'yuv420p', '-profile:v', 'main', '-movflags', '+faststart', '-threads', '4', str(output / f'asia-hero-{name}.mp4')], check=True)
