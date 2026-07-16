import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Adm {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;
}
