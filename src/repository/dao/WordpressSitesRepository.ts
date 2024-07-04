// WordpressSitesRepository.ts
import { WordpressSitesAttributes } from '../../@type/repository/models/Models';
import WordpressSitesRepositoryException from '../../core/exception/WordpressSitesRepositoryException';
import WordpressSites from '../models/WordpressSites.model';
import { CreateOptions, DestroyOptions, UpdateOptions } from 'sequelize';

export default class WordpressSitesRepository {
    public async create(siteData: any): Promise<WordpressSites> {
        try {
            const site = await WordpressSites.create(siteData);
            console.log('Site created:', site.dataValues); // Log to check inserted data
            return site;
        } catch (error) {
            throw new WordpressSitesRepositoryException(`Could not create WordpressSite: ${error}`);
        }
    }

    public async findById(id: number): Promise<WordpressSites | null> {
        try {
            const site = await WordpressSites.findByPk(id);
            return site;
        } catch (error) {
            throw new WordpressSitesRepositoryException(`Could not find WordpressSite: ${error}`);
        }
    }

  
    public async updateStatus(id: number, status: string) {
        try {
            WordpressSites.update(
                { status: status },
                {
                  where: {
                    id: id,
                  }, 
                  returning: true, 
                }
              );
        } catch (error) {
            throw new WordpressSitesRepositoryException(`Could not update WordpressSite: ${error}`);
        }
    }

    public async findByName(strName: string): Promise<WordpressSites | null> {
        try {
            const site = await WordpressSites.findOne({ where: { app_name: strName } });
            return site;
        } catch (error) {
            throw new WordpressSitesRepositoryException(`Could not find WordpressSite by name: ${error}`);
        }
    }

    public async findAll(): Promise<WordpressSites[]> {
        try {
            const sites = await WordpressSites.findAll();
            return sites;
        } catch (error) {
            throw new WordpressSitesRepositoryException(`Could not fetch WordpressSites: ${error}`);
        }
    }
 
    public async delete(id: number): Promise<number> {
        try {
            const options: DestroyOptions = {
                where: { id: id },
            };
            const rowsDeleted = await WordpressSites.destroy(options);
            return rowsDeleted;
        } catch (error) {
            throw new WordpressSitesRepositoryException(`Could not delete WordpressSite: ${error}`);
        }
    }
}
