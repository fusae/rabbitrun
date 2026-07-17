# rabbitrun

Personal site: projects & writing. Pure HTML/CSS, zero JS.

## Deploy

GitHub Pages deploys from `.github/workflows/deploy.yml` with `--pathprefix=/rabbitrun/`.

Custom domain switch: remove the workflow `--pathprefix=/rabbitrun/` argument.
Add a `CNAME` file for the custom domain and set `SITE_URL` to that domain if feed absolute URLs should match it.
