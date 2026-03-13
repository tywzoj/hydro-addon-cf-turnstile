import type { Context, Handler } from "hydrooj";
import { ForbiddenError, Schema, superagent } from "hydrooj";

declare module "hydrooj" {
    export interface UiContext {
        turnstileSiteKey?: string;
    }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const packageJson = require("./package.json") as { name: string };
const SITE_KEY = "siteKey";
const SECRET_KEY = "secretKey";
const SETTING_SITE_KEY = `${packageJson.name}.${SITE_KEY}`;
const SETTING_SECRET_KEY = `${packageJson.name}.${SECRET_KEY}`;

export const enum CE_String {
    CF_TURNSTILE_TITLE = "cf-turnstile-response",
    SITE_KEY_DESC = "Cloudflare Turnstile Site Key",
    SECRET_KEY_DESC = "Cloudflare Turnstile Secret Key",
    ValidationFailed = "Turnstile verification failed",
    SecretKeyNotConfigured = "Turnstile secret key is not configured",
    Validating = "Turnstile Validating",
}

const strings: Record<string, Record<CE_String, string>> = {
    zh: {
        [CE_String.CF_TURNSTILE_TITLE]: "Cloudflare Turnstile 人机验证",
        [CE_String.SITE_KEY_DESC]: "Cloudflare Turnstile 网站密钥",
        [CE_String.SECRET_KEY_DESC]: "Cloudflare Turnstile 服务端密钥",
        [CE_String.ValidationFailed]: "Turnstile 人机验证失败",
        [CE_String.SecretKeyNotConfigured]: "Turnstile 密钥未配置",
        [CE_String.Validating]: "正在人机验证...",
    },
    zh_TW: {
        [CE_String.CF_TURNSTILE_TITLE]: "Cloudflare Turnstile 人機驗證",
        [CE_String.SITE_KEY_DESC]: "Cloudflare Turnstile 網站密鑰",
        [CE_String.SECRET_KEY_DESC]: "Cloudflare Turnstile 服務端密鑰",
        [CE_String.ValidationFailed]: "Turnstile 人機驗證失敗",
        [CE_String.SecretKeyNotConfigured]: "Turnstile 密鑰未配置",
        [CE_String.Validating]: "正在人機驗證...",
    },
    en: {
        [CE_String.CF_TURNSTILE_TITLE]: "Cloudflare Turnstile",
        [CE_String.SITE_KEY_DESC]: "Cloudflare Turnstile Site Key",
        [CE_String.SECRET_KEY_DESC]: "Cloudflare Turnstile Secret Key",
        [CE_String.ValidationFailed]: "Turnstile verification failed",
        [CE_String.SecretKeyNotConfigured]: "Turnstile secret key is not configured",
        [CE_String.Validating]: "Turnstile Validating",
    },
};

export const Config = Schema.object({
    [SITE_KEY]: Schema.string().description(CE_String.SITE_KEY_DESC),
    [SECRET_KEY]: Schema.string().description(CE_String.SECRET_KEY_DESC).role("secret"),
}).description(CE_String.CF_TURNSTILE_TITLE);

export function apply(ctx: Context) {
    for (const [lang, strMap] of Object.entries(strings)) {
        ctx.i18n.load(lang, strMap);
    }

    const uiCtxHandler = (handler: Handler) => {
        handler.UiContext.turnstileSiteKey = ctx.setting.get(SETTING_SITE_KEY) as string | undefined;
    };

    const postHandler = async (handler: Handler) => {
        if (!ctx.setting.get(SETTING_SITE_KEY)) return; // If site key is not configured, skip verification

        const secretKey = ctx.setting.get(SETTING_SECRET_KEY) as string | undefined;
        if (!secretKey) throw new ForbiddenError(CE_String.SecretKeyNotConfigured);
        const token = handler.args["cf-turnstile-response"] as string | undefined;

        /* eslint-disable @typescript-eslint/no-unsafe-member-access */

        const response = await superagent
            .post("https://challenges.cloudflare.com/turnstile/v0/siteverify")
            .field("secret", secretKey)
            .field("response", token || "")
            .field("remoteip", handler.request.ip);

        if (!response.body.success) {
            throw new ForbiddenError(CE_String.ValidationFailed);
        }
        /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    };

    ctx.on("handler/before", uiCtxHandler);
    ctx.on("handler/before/UserLogin#post", postHandler);
    ctx.on("handler/before/UserRegister#post", postHandler);
}
