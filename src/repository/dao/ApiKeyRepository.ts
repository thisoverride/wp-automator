import { ApiKeyAttributes } from '../../@type/repository/models/Models'; // Assurez-vous de définir correctement le chemin d'accès
import ApiKey from '../models/ApiKey.model'; // Assurez-vous de définir correctement le chemin d'accès
import { CreateOptions, DestroyOptions, UpdateOptions } from 'sequelize';


export default class ApiKeyRepository {
  public async create(apiKeyData: ApiKeyAttributes): Promise<ApiKeyAttributes> {
      try {
          const apiKey = await ApiKey.create(apiKeyData);
          console.log('API Key created:', apiKey.dataValues);
          return apiKey;
      } catch (error) {
          throw new Error(`Could not create API Key: ${error}`);
      }
  }

  public async findById(id: number): Promise<ApiKey | null> {
      try {
          const apiKey = await ApiKey.findByPk(id);
          return apiKey;
      } catch (error) {
          throw new Error(`Could not find API Key: ${error}`);
      }
  }



  public async delete(id: number): Promise<number> {
      try {
          const options: DestroyOptions = {
              where: { id: id },
          };
          const rowsDeleted = await ApiKey.destroy(options);
          return rowsDeleted;
      } catch (error) {
          throw new Error(`Could not delete API Key: ${error}`);
      }
  }
}
