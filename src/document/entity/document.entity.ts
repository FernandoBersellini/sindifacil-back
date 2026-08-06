import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Document {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    associateId: number;

    @Column()
    storageKey: string;

    @Column()
    originalFileName: string;

    @Column()
    mimeType: string;

    @Column()
    fileSize: number;

    @CreateDateColumn()
    uploadedAt: Date;

    @Column({ nullable: true })
    uploadedByEmployeeId?: number;
}
