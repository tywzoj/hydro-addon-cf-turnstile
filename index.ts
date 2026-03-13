import type { Context, Handler } from "hydrooj";
import { ForbiddenError, Schema, superagent, SystemModel } from "hydrooj";

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

export const Config = Schema.object({
    [SITE_KEY]: Schema.string().description("Cloudflare Turnstile Site Key"),
    [SECRET_KEY]: Schema.string().description("Cloudflare Turnstile Secret Key"),
}).description("Cloudflare Turnstile");

export function apply(ctx: Context) {
    const getHandler = (handler: Handler) => {
        handler.UiContext.turnstileSiteKey = SystemModel.get(SETTING_SITE_KEY) as string | undefined;
    };

    const postHandler = async (handler: Handler) => {
        const secretKey = SystemModel.get(SETTING_SECRET_KEY) as string | undefined;
        if (!secretKey) throw new ForbiddenError("Turnstile secret key is not configured");
        const token = handler.args["cf-turnstile-response"] as string | undefined;

        /* eslint-disable @typescript-eslint/no-unsafe-call */
        /* eslint-disable @typescript-eslint/no-unsafe-member-access */
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response = await superagent
            .post("https://challenges.cloudflare.com/turnstile/v0/siteverify")
            .field("secret", secretKey)
            .field("response", token || "")
            .field("remoteip", handler.request.ip);
        /* eslint-enable @typescript-eslint/no-unsafe-call */

        if (!response.body.success) {
            throw new ForbiddenError("Turnstile verification failed");
        }
        /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    };

    ctx.on("handler/before/#get", getHandler);
    ctx.on("handler/before/UserLogin#post", postHandler);
    ctx.on("handler/before/UserRegister#post", postHandler);
}
