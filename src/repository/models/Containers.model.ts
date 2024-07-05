// models/Containers.ts

import { Model, Table, Column, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import WordpressSites from './WordpressSites.model';

@Table({
    tableName: 'containers',
    timestamps: true,
    underscored: true,
    schema: 'wpswift_dev'
})
export default class Containers extends Model<Containers> {
    @Column
    description?: string;

    @Column(DataType.TEXT)
    logs?: string;

    @Column({ allowNull: false, defaultValue: 'active' })
    status!: string;

    @Column
    service?: string;

    @ForeignKey(() => WordpressSites)
    @Column
    wordpress_site_id!: number;

    @BelongsTo(() => WordpressSites)
    wordpress_site!: WordpressSites;
}
