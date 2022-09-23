/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';

// Composants généraux
import Graphique, { Props as PropsGraphique, DonneesGraph, getColonne } from './batons';
import BandeauStats, { TDonneesStats } from '@client/components/Donnees/Stats';
import Bouton from '@client/components/button';

/*----------------------------------
- TYPES
----------------------------------*/

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default <TDonnee extends DonneesGraph>({ 
    colonnes = {}, total, ...props 
}: PropsGraphique<TDonnee, 'bar'> & {
    total: {[cle in keyof TDonnee]: number}
}) => {

    let whitelist: string[];
    if (props.whitelist)
        whitelist = props.whitelistGraph;
    else if (Object.keys(colonnes).length !== 0)
        whitelist = Object.keys(colonnes);
    else
        whitelist = Object.keys(total);

    const [whitelistGraph, setWhitelist] = React.useState(whitelist);

    // Génère la liste des données pour le bandeau de stats 
    let totaux: TDonneesStats[] = []
    for (const nom of whitelist) {

        const col = getColonne(nom, colonnes);

        totaux.push({
            id: col.id,
            label: col.label,
            valeur: col.format 
                ? col.format(total[nom]) 
                : total[nom],
            icone: col.icone,
            couleur: col.couleur
        });
    }

    return (
        <div className="row al-stretch">

            <BandeauStats 
                donnees={totaux} 
                direction="col" esp={"05"}
                className="al-top esp-05" 

                itemProps={(col) => ({
                    style: whitelistGraph.includes(col.id) ? {} : { opacity: 0.5 },
                    className: 'card cliquable minimal',
                    onClick: () => {
                        if (whitelistGraph.length === 1)
                            return;
                        else if (whitelistGraph.includes(col.id))
                            setWhitelist( whitelistGraph.filter(id => id !== col.id) );
                        else
                            setWhitelist([...whitelistGraph, col.id])
                    }
                })}
            />

            <Graphique
                {...props}
                colonnes={colonnes}
                details
                className="col-1"
                whitelist={whitelistGraph}
            />

        </div>
    )


}