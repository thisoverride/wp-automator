// models/WordpressSites.ts
import { Model, Table, Column, DataType } from 'sequelize-typescript';
import { WordpressSitesAttributes } from '../../@type/repository/models/Models';



@Table({
    tableName: 'wordpress_sites',
    timestamps: true,
    underscored: true,
    schema: 'wpswift_dev'
})
export default class WordpressSites extends Model<WordpressSitesAttributes> {
    @Column({ allowNull: false })
    app_name!: string;

    @Column({ allowNull: false })
    url!: string;

    @Column({ allowNull: false, defaultValue: 'created' })
    status!: string;
}
