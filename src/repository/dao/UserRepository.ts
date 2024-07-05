import { UserAttributes } from '../../@type/repository/models/Models'; // Assurez-vous de définir correctement le chemin d'accès
import UserRepositoryException from '../../core/exception/UserRepositoryException'; // Importer exception personnalisée si nécessaire
import User from '../models/Users.model'; // Assurez-vous de définir correctement le chemin d'accès
import { CreateOptions, DestroyOptions, UpdateOptions } from 'sequelize';


export default class UserRepository {
  public async create(userData: UserAttributes): Promise<User> {
      try {
          const user = await User.create(userData);
          console.log('User created:', user.dataValues); // Optionnel : journalisation pour vérifier les données insérées
          return user;
      } catch (error) {
          throw new UserRepositoryException(`Could not create user: ${error}`);
      }
  }

  public async findById(id: number): Promise<User | null> {
      try {
          const user = await User.findByPk(id);
          return user;
      } catch (error) {
          throw new UserRepositoryException(`Could not find user: ${error}`);
      }
  }
  public async findByAppId(id: number): Promise<User | null> {
      try {
          const user = await User.findOne({
            where: {
              wordpress_site_id: id
            }
          });
          return user;
      } catch (error) {
          throw new UserRepositoryException(`Could not find user: ${error}`);
      }
  }


  public async delete(id: number): Promise<number> {
      try {
          const options: DestroyOptions = {
              where: { id: id },
          };
          const rowsDeleted = await User.destroy(options);
          return rowsDeleted;
      } catch (error) {
          throw new UserRepositoryException(`Could not delete user: ${error}`);
      }
  }

  // Ajoutez d'autres méthodes nécessaires, comme findAll, findByName, etc., selon vos besoins.
}
