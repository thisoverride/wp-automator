import { Response, Request } from 'express';
import { inject, injectable } from 'inversify';
import { GET } from '../framework/express/hotspring/hotSpring';
import { LanguageManager } from '../utils/LanguageManager';
import { Translation } from '../@type/global';
import ConsoleService from '../service/ConsoleService';
import HttpStatusCodes from '../utils/HttpStatusCode';

@injectable()
export default class ConsoleController {
    private readonly TRANSLATION: Translation = LanguageManager.getTranslations();
    // private readonly LOCAL: string = LanguageManager.getCurrentLanguage();
    private readonly _consoleService: ConsoleService;

    public constructor(
        @inject(ConsoleService) consoleService: ConsoleService
    ) {
        this._consoleService = consoleService;
    }

    /**
     * Récupère et affiche la page d'accueil avec les configurations nécessaires
     * @param request - Requête Express
     * @param response - Réponse Express
     */
    @GET('/')
    public async getConsole(request: Request, response: Response): Promise<void> {
        try {
            const consoleData = await this._consoleService.initConsole();

            
            response.render('index', {
                wordpressVersions: consoleData.wordpressVersions?.results || [],
                langs: consoleData.langsFilePath
            });
        } catch (error) {
            console.error('Erreur dans ConsoleController:', error);
            
            // const statusCode = error?.statusCode || HttpStatusCodes.INTERNAL_SERVER_ERROR;
            // const errorMessage = error?.message || this.TRANSLATION.errors.unknown[this.LOCAL];

            // response.status(statusCode).render('error', {
            //     error: errorMessage,
            //     translations: this.TRANSLATION,
            //     locale: this.LOCAL
            // });
        }
    }
}