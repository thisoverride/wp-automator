import { Model, Table, Column, ForeignKey, BelongsTo } from 'sequelize-typescript';
import ApiKeys from './ApiKey.model';
import WordpressSites from './WordpressSites.model';
import { UserAttributes } from '../../@type/repository/models/Models';

@Table({
    tableName: 'users',
    timestamps: true,
    underscored: true,
    schema: 'wpswift_dev'
})
export default class Users extends Model<UserAttributes> {
    @Column({ allowNull: false })
    username!: string;

    @Column({ allowNull: false })
    password!: string;

    @Column({ allowNull: false })
    email!: string;

    @Column({ allowNull: false, defaultValue: 'viewer' })
    type!: string;

    @ForeignKey(() => ApiKeys)
    @Column
    api_key_id!: number;

    @BelongsTo(() => ApiKeys)
    api_key!: ApiKeys;

    @ForeignKey(() => WordpressSites)
    @Column
    wordpress_site_id!: number;

    @BelongsTo(() => WordpressSites)
    wordpress_site!: WordpressSites;
}
