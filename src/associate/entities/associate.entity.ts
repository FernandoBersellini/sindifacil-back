import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Associate {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    birthDate: Date;

    @Column()
    mothersName: string;

    @Column()
    fathersName: string;

    @Column({ nullable: true })
    registrationNumber: string;

    @Column({ nullable: true })
    storageKey: string;

    @Column({ nullable: true })
    originalFilename: string;

    @Column({ nullable: true })
    mimeType: string;

    @Column({ nullable: true })
    uploadedAt: Date;
}
