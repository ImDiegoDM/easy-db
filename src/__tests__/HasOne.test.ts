import { DB, IDbFields, IDbRelationship, IDbRelationshipObject, RelationshipTypes } from '../DB';
import conection from '../dbConection';

class PhonesHO extends DB {
  public static tableName = 'phonesHO';
  public static fields = {
    number: '',
    usersHO_id: '',
  };
}

// tslint:disable-next-line:max-classes-per-file
class UsersHO extends DB {
  public static tableName = 'usersHO';
  public static fields = {
    name: '',
    email: '',
  };

  public static relantionships = {
    phonesHO: {
      type: RelationshipTypes.hasOne,
      table: PhonesHO,
    },
  };
}

describe('Relantionship has one test', () => {
  
  beforeAll(() => {
    return new Promise((res, rej) => {
      conection.query(`CREATE TABLE usersHO(
        id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(30) NOT NULL,
        email VARCHAR(50)
      )`, (err: any) => {
        if (err) {
          rej(err);
        }
        res();
      });
    });
  });

  beforeAll(() => {
    return new Promise((res, rej) => {
      conection.query(`CREATE TABLE phonesHO(
        id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        number VARCHAR(30) NOT NULL,
        usersHO_id INT(6) UNSIGNED NOT NULL
      )`, (err: any) => {
        if (err) {
          rej(err);
        }
        res();
      });
    });
  });

  test('should return users and his relantionships', async () => {
    const result = await UsersHO.save({
      name: 'diego',
      email: 'contato@diegomatias.com.br',
    });

    const id = result.insertId;

    await PhonesHO.save([
      {
        number: '124654131',
        users_id: id,
      },
      {
        number: '32132654',
        users_id: id,
      },
      {
        number: '65654',
        users_id: id + 10,
      },
    ]);

    const user = await UsersHO.get(id);

    expect(user).toHaveProperty('phonesHO');
    expect(user.phonesHO).toHaveLength(1);
  });

  afterEach( () => {
    return new Promise((res, rej) => {
      conection.query(`DELETE FROM phonesHO;`, (err: any) => {
        if (err) {
          rej(err);
        }
        conection.query(`DELETE FROM phonesHO;`, (errP) => {
          if (errP) {
            rej(errP);
          }
          res();
        });
      });
    });
  });
  
  afterAll(() => {
    return new Promise((res, rej) => {
      conection.query(`DROP TABLE usersHO, phonesHO`, (err: any) => {
        if (err) {
          rej(err);
        }
        conection.end();
        res();
      });
    });
  });
});
