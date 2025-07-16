import { Module } from '@nestjs/common';
import { UserWalletController } from './user-wallet.controller';
import { UserWalletService } from './user-wallet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserWallet  } from './entity/user-wallet.entity';
import { User } from 'src/users/entity/user.entity';

@Module({
  imports: [TypeOrmModule .forFeature([UserWallet, User])],
  controllers: [UserWalletController],
  providers: [UserWalletService]
})
export class UserWalletModule {}
