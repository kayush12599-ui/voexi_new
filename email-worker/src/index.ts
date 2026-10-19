import { Resend } from 'resend';

export interface Env {
	// This is set via `wrangler secret put RESEND_API_KEY`
	RESEND_API_KEY: string;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// 1. Handle CORS Preflight
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// 2. Validate Route & Method
		const url = new URL(request.url);
		if (url.pathname !== '/api/send-email' || request.method !== 'POST') {
			return new Response(JSON.stringify({ success: false, error: 'Route not found' }), {
				status: 404,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		try {
			// 3. Parse Request Body
			const { to, subject, html } = (await request.json()) as {
				to: string;
				subject: string;
				html: string;
			};

			if (!to || !subject || !html) {
				return new Response(JSON.stringify({ success: false, error: 'Missing required fields: to, subject, html' }), {
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			// 4. Initialize Resend
			if (!env.RESEND_API_KEY) {
				throw new Error('RESEND_API_KEY is not configured on the server.');
			}
			const resend = new Resend(env.RESEND_API_KEY);

			// 5. Dispatch Email
			console.log(`[VNC CLOUD] Dispatching email to: ${to}`);
			const { data, error } = await resend.emails.send({
				from: 'VOEXI <noreply@voexi.online>',
				to: [to],
				subject: subject,
				html: html,
			});

			if (error) {
				console.error('[RESEND ERROR]', error);
				return new Response(JSON.stringify({ success: false, error: error.message }), {
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			// 6. Return Success
			return new Response(JSON.stringify({ success: true, id: data?.id }), {
				status: 200,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		} catch (err: any) {
			console.error('[WORKER CRITICAL]', err.message);
			return new Response(JSON.stringify({ success: false, error: err.message }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};
