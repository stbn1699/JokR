import type {QuizzTopic} from "./types.ts";
import {cars} from "./cars.ts";
import {comediesFrancaises} from "./comediesFrancaises.ts";
import {disney} from "./disney.ts";
import {filmsHorreur} from "./filmsHorreur.ts";
import {jamesBond} from "./jamesBond.ts";
import {jurassicPark} from "./jurassicPark.ts";
import {seigneurDesAnneaux} from "./seigneurDesAnneaux.ts";
import {marvel} from "./marvel.ts";
import {oscars} from "./oscars.ts";
import {piratesDesCaraibes} from "./piratesDesCaraibes.ts";
import {pixar} from "./pixar.ts";
import {retourVersLeFutur} from "./retourVersLeFutur.ts";
import {starWars} from "./starWars.ts";
import {tarantino} from "./tarantino.ts";
import {arcane} from "./arcane.ts";
import {breakingBad} from "./breakingBad.ts";
import {brooklynNineNine} from "./brooklynNineNine.ts";
import {cyberpunkEdgerunners} from "./cyberpunkEdgerunners.ts";
import {doctorWho} from "./doctorWho.ts";
import {friends} from "./friends.ts";
import {gameOfThrones} from "./gameOfThrones.ts";
import {kaamelott} from "./kaamelott.ts";
import {casaDePapel} from "./casaDePapel.ts";
import {simpson} from "./simpson.ts";
import {strangerThings} from "./strangerThings.ts";
import {the100} from "./the100.ts";
import {theOffice} from "./theOffice.ts";
import {theWitcher} from "./theWitcher.ts";
import {assassinsCreed} from "./assassinsCreed.ts";
import {cyberpunk} from "./cyberpunk.ts";
import {souls} from "./souls.ts";
import {finalFantasy} from "./finalFantasy.ts";
import {fortnite} from "./fortnite.ts";
import {gta} from "./gta.ts";
import {leagueOfLegends} from "./leagueOfLegends.ts";
import {mario} from "./mario.ts";
import {minecraft} from "./minecraft.ts";
import {pokemon} from "./pokemon.ts";
import {retroGaming} from "./retroGaming.ts";
import {skyrim} from "./skyrim.ts";
import {warhammer} from "./warhammer.ts";
import {zelda} from "./zelda.ts";
import {agathaChristie} from "./agathaChristie.ts";
import {asterix} from "./asterix.ts";
import {bdFrancoBelge} from "./bdFrancoBelge.ts";
import {harryPotter} from "./harryPotter.ts";
import {litteratureFrancaise} from "./litteratureFrancaise.ts";
import {mythologieGrecque} from "./mythologieGrecque.ts";
import {mythologieNordique} from "./mythologieNordique.ts";
import {sherlockHolmes} from "./sherlockHolmes.ts";
import {tintin} from "./tintin.ts";
import {deathNote} from "./deathNote.ts";
import {demonSlayer} from "./demonSlayer.ts";
import {dragonBall} from "./dragonBall.ts";
import {fullmetalAlchemist} from "./fullmetalAlchemist.ts";
import {jujutsuKaisen} from "./jujutsuKaisen.ts";
import {attaqueDesTitans} from "./attaqueDesTitans.ts";
import {myHeroAcademia} from "./myHeroAcademia.ts";
import {naruto} from "./naruto.ts";
import {onePiece} from "./onePiece.ts";
import {ghibli} from "./ghibli.ts";
import {varieteFrancaise} from "./varieteFrancaise.ts";
import {eurovision} from "./eurovision.ts";
import {beatles} from "./beatles.ts";
import {michaelJackson} from "./michaelJackson.ts";
import {musiqueClassique} from "./musiqueClassique.ts";
import {rapFrancais} from "./rapFrancais.ts";
import {rock} from "./rock.ts";
import {electroFrancaise} from "./electroFrancaise.ts";
import {football} from "./football.ts";
import {formule1} from "./formule1.ts";
import {jeuxOlympiques} from "./jeuxOlympiques.ts";
import {ligueDesChampions} from "./ligueDesChampions.ts";
import {nba} from "./nba.ts";
import {rugby} from "./rugby.ts";
import {tennis} from "./tennis.ts";
import {tourDeFrance} from "./tourDeFrance.ts";
import {internetMemes} from "./internetMemes.ts";
import {twitch} from "./twitch.ts";
import {youtubeurs} from "./youtubeurs.ts";
import {animaux} from "./animaux.ts";
import {capitales} from "./capitales.ts";
import {chimie} from "./chimie.ts";
import {corpsHumain} from "./corpsHumain.ts";
import {cuisineFrancaise} from "./cuisineFrancaise.ts";
import {dinosaures} from "./dinosaures.ts";
import {espace} from "./espace.ts";
import {geographieFrance} from "./geographieFrance.ts";
import {histoireFrance} from "./histoireFrance.ts";
import {inventions} from "./inventions.ts";
import {langueFrancaise} from "./langueFrancaise.ts";
import {monuments} from "./monuments.ts";
import {peinture} from "./peinture.ts";
import {roisDeFrance} from "./roisDeFrance.ts";
import {secondeGuerreMondiale} from "./secondeGuerreMondiale.ts";
import {vinsFromages} from "./vinsFromages.ts";

export * from "./types.ts";

/**
 * Tous les thèmes du Quizz. Pour en ajouter un : un fichier dans ce dossier (voir starWars.ts), puis
 * `python scripts/sync-quizz-topics.py`, qui remet à jour cette liste et sa copie sur le serveur. Ses questions vont
 * en base (quizz_questions), par une migration SQL (voir V1_0_80__quizz_site_questions.sql).
 */
export const QUIZZ_TOPICS: QuizzTopic[] = [
    cars,
    comediesFrancaises,
    disney,
    filmsHorreur,
    jamesBond,
    jurassicPark,
    seigneurDesAnneaux,
    marvel,
    oscars,
    piratesDesCaraibes,
    pixar,
    retourVersLeFutur,
    starWars,
    tarantino,
    arcane,
    breakingBad,
    brooklynNineNine,
    cyberpunkEdgerunners,
    doctorWho,
    friends,
    gameOfThrones,
    kaamelott,
    casaDePapel,
    simpson,
    strangerThings,
    the100,
    theOffice,
    theWitcher,
    assassinsCreed,
    cyberpunk,
    souls,
    finalFantasy,
    fortnite,
    gta,
    leagueOfLegends,
    mario,
    minecraft,
    pokemon,
    retroGaming,
    skyrim,
    warhammer,
    zelda,
    agathaChristie,
    asterix,
    bdFrancoBelge,
    harryPotter,
    litteratureFrancaise,
    mythologieGrecque,
    mythologieNordique,
    sherlockHolmes,
    tintin,
    deathNote,
    demonSlayer,
    dragonBall,
    fullmetalAlchemist,
    jujutsuKaisen,
    attaqueDesTitans,
    myHeroAcademia,
    naruto,
    onePiece,
    ghibli,
    varieteFrancaise,
    eurovision,
    beatles,
    michaelJackson,
    musiqueClassique,
    rapFrancais,
    rock,
    electroFrancaise,
    football,
    formule1,
    jeuxOlympiques,
    ligueDesChampions,
    nba,
    rugby,
    tennis,
    tourDeFrance,
    internetMemes,
    twitch,
    youtubeurs,
    animaux,
    capitales,
    chimie,
    corpsHumain,
    cuisineFrancaise,
    dinosaures,
    espace,
    geographieFrance,
    histoireFrance,
    inventions,
    langueFrancaise,
    monuments,
    peinture,
    roisDeFrance,
    secondeGuerreMondiale,
    vinsFromages,
];

export const findTopic = (id: string | undefined) => QUIZZ_TOPICS.find(t => t.id === id);
