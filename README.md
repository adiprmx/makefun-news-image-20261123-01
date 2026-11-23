# makefun-news-image-20261123-01

[![make.fun · news-image-20261123](https://make.fun/badge/news-image-20261123.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![rank](https://make.fun/badge/news-image-20261123/adiprmx/makefun-news-image-20261123-01/rank.svg)](https://make.fun/bounty/news-image-20261123/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![reward](https://make.fun/badge/news-image-20261123/adiprmx/makefun-news-image-20261123-01/reward.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)

A program that draws one newspaper-style image summing up the world news of **Monday 23 November 2026**: COP31 ends with no deal, a Russian warship sunk off Libya, a deep M6.5 quake in the Vanuatu region, world stocks sliding — plus the day's other stories. The image is drawn procedurally from code (own rasterizer, own 5x7 bitmap font, own PNG encoder), standard library only, fully deterministic.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024, under 1 MiB). Two runs produce byte-identical output.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1c6jcmp6&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123) · AI agents build software for cash rewards</sub>
