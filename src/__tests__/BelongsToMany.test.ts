import { DB, IDbFields, IDbRelationship, IDbRelationshipObject, RelationshipTypes } from '../DB';
import conection from '../dbConection';

class UsersBTM extends DB {
  public static tableName = 'usersBTM';
  public static fields = {
    name: '',
    email: '',
  };

  public static relantionships = {
    phonesBTM: {
      type: RelationshipTypes.belongsToMany,
      table: 'phonesBTM',
      fields: {
        number: '',
      },
      hasTimestamps: false,
    },
  };

}

// tslint:disable-next-line:max-classes-per-file
class PhonesBTM extends DB {
  public static tableName = 'phonesBTM';
  public static fields = {
    number: ''
  };

  public static relantionships = {
    usersBTM: {
      type: RelationshipTypes.belongsToMany,
      table: 'usersBTM',
      fields: {
        name: '',
        email: '',
      },
      hasTimestamps: false,
    },
  };

  public static atachUsersBTM(id: string, usersBTM_id: string){
    return this.atach(id,'usersBTM',usersBTM_id);
  }
}

describe('Relantionship has one test', () => {
  
  beforeAll(() => {
    return new Promise((res, rej) => {
      conection.query(`CREATE TABLE usersBTM(
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
      conection.query(`CREATE TABLE phonesBTM(
        id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        number VARCHAR(30) NOT NULL
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
      conection.query(`CREATE TABLE phonesBTM_usersBTM(
        usersBTM_id INT(6) UNSIGNED NOT NULL,
        phonesBTM_id INT(6) UNSIGNED NOT NULL
      )`, (err: any) => {
        if (err) {
          rej(err);
        }
        res();
      });
    });
  });

  test('should return phone and his relantionships', async () => {

    await UsersBTM.save([
      {
        name: 'diego',
        email: 'contato@diegomatias.com.br',
      },
      {
        name: 'douglas',
        email: 'contato@diegomatias.com.br',
      },
    ]);

    await PhonesBTM.save([
      {
        number: '124654131',
      },
      {
        number: '32132654',
      },
      {
        number: '65654',
      },
    ]);

    await PhonesBTM.atachUsersBTM('1','1');
    await PhonesBTM.atachUsersBTM('1','1');
    await PhonesBTM.atachUsersBTM('2','2');
    await PhonesBTM.atachUsersBTM('3','1');

    const phonesAll = await PhonesBTM.all();

    expect(phonesAll[0]).toHaveProperty('usersBTM');
    expect(phonesAll).toMatchSnapshot();

    const usersAll = await UsersBTM.all();

    expect(usersAll[0]).toHaveProperty('phonesBTM');
    expect(usersAll).toMatchSnapshot();
  });

  afterEach( () => {
    return new Promise((res, rej) => {
      conection.query(`DELETE FROM phonesBTM;`, (err: any) => {
        if (err) {
          rej(err);
        }
        conection.query(`DELETE FROM usersBTM;`, (errP) => {
          if (errP) {
            rej(errP);
          }
          conection.query(`DELETE FROM phonesBTM_usersBTM;`, (errP) => {
            if (errP) {
              rej(errP);
            }
            res();
          });
        });
      });
    });
  });
  
  afterAll(() => {
    return new Promise((res, rej) => {
      conection.query(`DROP TABLE usersBTM, phonesBTM, phonesBTM_usersBTM`, (err: any) => {
        if (err) {
          rej(err);
        }
        conection.end();
        res();
      });
    });
  });
});
