/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm

// Core
import route from '@router';
import app, { $ } from '@server/app';
import getStats from '@server/services/database/stats';

/*----------------------------------
- ROUTES
----------------------------------*/

route.get('*', { priority: 10 }, async ({ request, user, auth, response }) => {

    if (!request.accepts('html'))
        return undefined;

    // User activity
    if (user) {

       

    } else {

        // Referrer Tracking: <url>?r=<referrer>
        const referrer = request.req.query.r;
        await $.auth.setReferrer(referrer, request);

    }
});

route.get('/r/:referrer', { priority: 10 }, async ({ response, request }) => {

    const { referrer } = request.data;
    
    await $.auth.setReferrer(referrer, request);

    return response.redirect('/');

});

route.post('/auth/email', async ({ schema, auth, request, response, detect }) => {

    const { email } = await schema.validate({
        email: schema.email(),
    });

    return await $.auth.Auth(email, request);

});

route.get('/auth/google', async ({ auth, response, request }) => {

    return response.redirect( await $.auth.FromGoogle(request) );

});

route.get('/auth/google/response', async ({ auth, response, request, detect }) => {

    // Pas besoin de passer par schema, car le code est seulement et diectement passé à l'api de google
    let { code } = request.data;
    code = decodeURIComponent(code);

    const { redirect } = await $.auth.GoogleResponse('code', code, request);

    return response.redirect( redirect );

});

// Android app: One tap UI
route.get('/auth/google/onetap/:token', async ({ request, auth, response, detect }) => {

    // Pas besoin de passer par schema, car le token est seulement et diectement passé à l'api de google
    const { token } = request.data;

    const authRes = await $.auth.GoogleResponse('token', token, request);

    return response.text( authRes.token );

});

route.post('/auth/logout', async ({ auth }) => {

    auth.logout();

    return true;

});

route.get('/invite', async ({ auth, schema }) => {

    const user = await auth.check("USER");

    const referrals = await app.services.sql`
        SELECT 
            name,
            country,
            meet,
            activity
        FROM User u
        WHERE referrer = ${user.name}
    `.all();

    const stats = await getStats('UserStats', [
        'refClics',
        'refSignups',
        'refCommission'
    ], {
        relative: true,
        period: '12 hours', 
        interval: '1 hour',
        where: user ? (`user = ` + app.services.sql.esc(user.name)) : '0',
        cache: user ? { 
            id: 'user.' + user.name + '.referrals' 
        } : undefined
    });

    return { ...stats, referrals };

});

route.get('/@:name/avatar.webp', {
    logging: false,
    priority: 2, // Before /@:username/:threadslug
}, async ({ schema, response }) => {

    const { name } = await schema.validate({
        name: schema.string()
    });

    if (name === "null")
        return response.file(Logo);

    const { emailHash } = await app.services.sql`
        SELECT emailHash 
        FROM User 
        WHERE name = ${name}
    `.firstOrFail();

    return response.redirect("https://www.gravatar.com/avatar/" + emailHash + "?s=64&d=mp");

});