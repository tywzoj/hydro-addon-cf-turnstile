# Hydro Addon: Cloudflare Turnstile

This addon integrates Cloudflare's Turnstile CAPTCHA into [Hydro](https://github.com/hydro-dev/Hydro)'s user registration and login forms, providing an additional layer of security against automated bots.

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/tywzoj/hydro-addon-cf-turnstile.git
    ```

2. Apply the addon to your Hydro instance:

    ```bash
    hydrooj addon add /path/to/hydro-addon-cf-turnstile
    pm2 restart hydrooj
    ```

## Usage

1. Obtain your [Cloudflare Turnstile](https://www.cloudflare.com/application-services/products/turnstile/) site key and secret key from the [Cloudflare dashboard](https://dash.cloudflare.com/).

2. Login as an administrator on Hydro and navigate to the system configuration page.

3. In section "Cloudflare Turnstile", enter your site key and secret key.

4. Save the configuration.
