// Types


export default (page: TInfosPage, route: TInfosRoute) => {
    //const isSubPage = pageTitle && url.pathname !== '/';

    let schemaPage = {
        '@type': "WebPage",
        '@id': route.requete.url,
        name: page.title,
        url: route.requete.url,
        description: page.description,
        potentialAction: [{
            "@type": "SearchAction"
        }],

        ...(page.metas.richSnippetsPage === undefined ? {} : page.metas.richSnippetsPage)
    }

    /*if (isSubPage)
        schemaPage.breadcrumb = {
            '@context': 'http://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    item: {
                        '@id': siteUrl,
                        name: siteTitle,
                    },
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    item: {
                        '@id': canonical,
                        name: pageTitle,
                    },
                },
            ],
        }*/

    let schemaFinal = page.metas.richSnippets === undefined ? schemaPage : {
        ...page.metas.richSnippets,
        mainEntityOfPage: schemaPage
    };

    return {
        '@context': 'http://schema.org',
        ...schemaFinal
    }

    /*
    '@type': 'WebSite',
    url: SEO.url,
    name: SEO.titre.site,
    inLanguage: 'French',
    about: [{
        "@type": "Thing",
        name: "Gagner de l'argent sur internet"
    }, {
        "@type": "Thing",
        name: "Développer son business en ligne"
    }, {
        "@type": "Thing",
        name: "Marketing"
    }]
     */
};
