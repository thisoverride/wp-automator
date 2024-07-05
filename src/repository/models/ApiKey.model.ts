// models/ApiKeys.ts

import { Model, Table, Column, DataType } from 'sequelize-typescript';
import { ApiKeyAttributes } from '../../@type/repository/models/Models';

@Table({
    tableName: 'api_keys',
    timestamps: true,
    underscored: true,
    schema: 'wpswift_dev'
})
export default class ApiKeys extends Model<ApiKeyAttributes> {
    @Column({ allowNull: false })
    consumer_key!: string;

    @Column({ allowNull: false })
    consumer_secret!: string;
}
 