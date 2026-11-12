import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Document } from 'src/document/entity/document.entity';

// Localização física de uma ficha: armário + gaveta, sem posição dentro da
// gaveta. Um documento tem zero ou um mapeamento; sem mapeamento, ele está
// "aguardando alocação" (docs/mapeamento.md §3.3).
@Entity()
@Index(['cabinet', 'drawer'])
export class Mapping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  documentId: number;

  // @OneToOne + @JoinColumn cria a restrição de unicidade em documentId,
  // que garante no banco no máximo um mapeamento por documento (RN7).
  // Excluir o documento exclui o mapeamento e libera a vaga na gaveta.
  @OneToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column()
  cabinet: string;

  @Column()
  drawer: string;

  @Column({ nullable: true })
  allocatedByUserId?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
