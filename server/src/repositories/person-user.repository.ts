import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { jsonObjectFrom } from 'kysely/helpers/postgres';
import { InjectKysely } from 'nestjs-kysely';
import { DummyValue, GenerateSql } from 'src/decorators.js';
import { DB } from 'src/schema/index.js';
import { PersonUserTable } from 'src/schema/tables/person-user.table.js';

@Injectable()
export class PersonUserRepository {
  constructor(@InjectKysely() private db: Kysely<DB>) {}

  @GenerateSql({ params: [DummyValue.UUID] })
  getForOwner(ownerId: string) {
    return this.db
      .selectFrom('person_user')
      .select([
        'person_user.personGroupId as personId',
        'person_user.sharedById',
        'person_user.sharedWithId',
        'person_user.role',
      ])
      .select((eb) =>
        jsonObjectFrom(eb.selectFrom('user').selectAll().whereRef('user.id', '=', 'person_user.sharedWithId'))
          .$notNull()
          .as('sharedWith'),
      )
      .where('person_user.sharedById', '=', ownerId)
      .execute();
  }

  createAll(dto: Insertable<PersonUserTable>[]) {
    return this.db
      .insertInto('person_user')
      .values(dto)
      .onConflict((oc) =>
        oc
          .columns(['personGroupId', 'sharedById', 'sharedWithId'])
          .doUpdateSet((eb) => ({ role: eb.ref('excluded.role') })),
      )
      .execute();
  }
}
