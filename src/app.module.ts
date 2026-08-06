import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmployeeModule } from './employee/employee.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Employee } from './employee/entities/employee.entity';
import { AdmModule } from './adm/adm.module';
import { AssociateModule } from './associate/associate.module';
import { AuthModule } from './auth/auth.module';
import { Adm } from './adm/entities/adm.entity';

@Module({
  imports: [EmployeeModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: process.env.DB_PASSWORD,
      database: 'sindifacil_db',
      entities: [Employee, Adm],
      autoLoadEntities: true,
      synchronize: true,
    }),
    AdmModule,
    AssociateModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
