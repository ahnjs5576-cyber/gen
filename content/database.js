(window.CS_SUBJECTS = window.CS_SUBJECTS || []).push({
  id: 'database',
  title: '데이터베이스시스템',
  tagline: '데이터를 안전하게 저장하고 빠르게 꺼내는 법',
  lessons: [
    {
      id: 'database-01',
      title: '데이터베이스와 DBMS',
      minutes: 4,
      oneLiner: '여러 사용자가 공유하는 데이터를 한곳에 모으고, 그 관리를 전담 소프트웨어(DBMS)에 맡기는 방식.',
      analogy: '부서마다 따로 엑셀 파일을 들고 있으면 같은 고객 주소가 세 군데서 서로 다르게 고쳐진다. 데이터베이스는 회사 공용 서고이고, DBMS는 그 서고의 사서다. 누가 무엇을 빌려 가고 고치는지 사서가 정리하니 엉키지 않는다.',
      points: [
        '**데이터베이스(Database)**는 여러 응용이 공유하려고 통합해 저장한 데이터의 모음이다.',
        '**DBMS(Database Management System)**는 저장, 검색, 동시 접근, 권한, 장애 복구를 대신 처리하는 소프트웨어다. MySQL, PostgreSQL, Oracle 등이 있다.',
        '파일 시스템으로 직접 관리하면 **중복**과 **불일치**가 생기고, 동시 수정과 장애 처리를 응용마다 따로 구현해야 한다.',
        '**3단계 스키마**(외부, 개념, 내부)로 사용자 관점과 저장 방식을 분리한다. 그래서 저장 구조를 바꿔도 응용을 고칠 필요가 줄어든다. 이를 **데이터 독립성**이라 한다.',
        'SQL 명령은 정의용 **DDL**(CREATE 등), 조작용 **DML**(SELECT, INSERT 등), 권한 제어용 **DCL**(GRANT 등)로 나뉜다.'
      ],
      example: {
        caption: 'DDL로 표를 만들고 DML로 데이터를 다룬다',
        lang: 'sql',
        code: "-- DDL: 구조 정의\nCREATE TABLE customer (\n  id   INT PRIMARY KEY,\n  name VARCHAR(50) NOT NULL\n);\n\n-- DML: 데이터 조작\nINSERT INTO customer VALUES (1, '김하나');\nSELECT name FROM customer WHERE id = 1;"
      },
      terms: [
        { term: '스키마(Schema)', desc: '데이터베이스의 구조와 제약 조건에 대한 정의.' },
        { term: '데이터 독립성', desc: '하위 단계 스키마가 바뀌어도 상위 단계(응용)가 영향을 받지 않는 성질.' },
        { term: 'DDL / DML / DCL', desc: '각각 구조 정의, 데이터 조작, 권한 제어용 SQL 명령 분류.' }
      ],
      pitfall: '데이터베이스와 DBMS는 같은 말이 아니다. 데이터베이스는 데이터 자체이고 DBMS는 그것을 관리하는 소프트웨어다.',
      quiz: [
        {
          q: '파일 시스템 대신 DBMS를 쓸 때 얻는 이점으로 가장 거리가 먼 것은?',
          choices: ['데이터 중복과 불일치 감소', '동시 접근 제어와 장애 복구 제공', '모든 질의가 항상 파일 직접 읽기보다 빠름', '권한 관리를 한곳에서 처리'],
          answer: 2,
          why: 'DBMS는 관리 기능을 제공하지만 오버헤드도 있어서, 단순한 순차 읽기는 파일 직접 접근이 더 빠를 수 있다.'
        },
        {
          q: '디스크 저장 구조를 바꿔도 응용 프로그램을 고치지 않아도 되는 성질은?',
          choices: ['물리적 데이터 독립성', '참조 무결성', '원자성', '논리적 데이터 종속성'],
          answer: 0,
          why: '내부(물리) 스키마의 변경이 개념 스키마와 응용에 영향을 주지 않는 것이 물리적 데이터 독립성이다.'
        },
        {
          q: '`GRANT SELECT ON customer TO kim;`은 어떤 분류의 SQL인가?',
          choices: ['DDL', 'DML', 'DCL', 'TCL'],
          answer: 2,
          why: 'GRANT와 REVOKE는 권한을 다루는 DCL(Data Control Language)이다.'
        }
      ]
    },
    {
      id: 'database-02',
      title: '관계형 모델',
      minutes: 4,
      oneLiner: '데이터를 행과 열로 된 표(릴레이션)로 표현하고, 표 사이 관계는 값으로 연결하는 모델.',
      analogy: '학교 명부를 떠올리면 된다. 한 줄이 학생 한 명, 각 칸이 이름이나 학번 같은 속성이다. 다른 명부와는 학번이라는 같은 값으로 이어 붙인다. 포인터 대신 값으로 연결하는 것이 핵심이다.',
      points: [
        '**릴레이션(Relation)**은 표, **튜플(Tuple)**은 행, **속성(Attribute)**은 열에 해당한다.',
        '각 속성이 가질 수 있는 값의 집합을 **도메인(Domain)**이라 한다. 예를 들어 학년의 도메인은 1~4.',
        '속성 수를 **차수(Degree)**, 튜플 수를 **카디널리티(Cardinality)**라 한다.',
        '이론상 릴레이션은 집합이라서 튜플에 **순서가 없고 중복도 없다**. 각 칸의 값은 더 쪼갤 수 없는 **원자값**이다.',
        '1970년 E. F. Codd가 제안했고, SQL은 이 모델을 다루는 표준 언어다.'
      ],
      example: {
        caption: '학생 릴레이션: 차수 3, 카디널리티 3',
        lang: 'text',
        code: '학번   | 이름   | 학년\n-------+--------+-----\n2301   | 김하나 | 1\n2208   | 이두리 | 2\n2115   | 박세나 | 3'
      },
      terms: [
        { term: '튜플(Tuple)', desc: '릴레이션의 한 행. 하나의 개체를 나타낸다.' },
        { term: '도메인(Domain)', desc: '한 속성이 가질 수 있는 원자값들의 집합.' },
        { term: '카디널리티(Cardinality)', desc: '릴레이션에 들어 있는 튜플의 개수.' }
      ],
      pitfall: '실제 SQL 테이블은 기본 키가 없으면 중복 행을 허용하고, ORDER BY 없이 조회한 행 순서는 보장되지 않는다.',
      quiz: [
        {
          q: '속성 5개, 튜플 200개인 릴레이션의 차수와 카디널리티는?',
          choices: ['차수 200, 카디널리티 5', '차수 5, 카디널리티 200', '차수 5, 카디널리티 5', '차수 1000, 카디널리티 200'],
          answer: 1,
          why: '차수는 속성(열) 수, 카디널리티는 튜플(행) 수다.'
        },
        {
          q: '관계형 모델의 릴레이션 특성으로 옳지 않은 것은?',
          choices: ['튜플 사이에 순서가 없다', '각 속성값은 원자값이다', '같은 튜플이 중복되지 않는다', '속성은 반드시 정해진 순서로 접근해야 한다'],
          answer: 3,
          why: '속성은 이름으로 구별하므로 열의 순서는 의미가 없다.'
        }
      ]
    },
    {
      id: 'database-03',
      title: '키와 무결성 제약',
      minutes: 5,
      oneLiner: '튜플을 유일하게 구별하는 키와, 데이터가 틀어지지 않게 DBMS가 강제하는 규칙.',
      analogy: '주민등록번호는 사람 한 명을 정확히 가리키는 기본 키다. 택배 송장에 적힌 주민번호가 실제로 없는 번호라면 배송이 꼬인다. 외래 키 제약은 존재하는 사람에게만 송장을 쓰게 막는 규칙이다.',
      points: [
        '**슈퍼 키**는 튜플을 유일하게 구별하는 속성 집합이고, 그중 군더더기 없는 최소 집합이 **후보 키(Candidate Key)**다.',
        '후보 키 중 대표로 고른 것이 **기본 키(Primary Key)**, 나머지는 **대체 키**다.',
        '**외래 키(Foreign Key)**는 다른 릴레이션의 기본 키(또는 유일 키)를 참조하는 속성이다.',
        '**개체 무결성**: 기본 키는 NULL일 수 없고 중복될 수 없다.',
        '**참조 무결성**: 외래 키 값은 참조 대상에 실제로 있는 값이거나 NULL이어야 한다. 위반하는 삽입, 삭제는 거부되거나 `ON DELETE CASCADE` 같은 규칙으로 처리된다.'
      ],
      example: {
        caption: '외래 키로 주문과 고객을 묶는다',
        lang: 'sql',
        code: "CREATE TABLE orders (\n  id          INT PRIMARY KEY,\n  customer_id INT NOT NULL,\n  amount      INT CHECK (amount > 0),\n  FOREIGN KEY (customer_id)\n    REFERENCES customer(id)\n    ON DELETE CASCADE\n);\n-- 없는 고객 번호로 INSERT하면 오류가 난다"
      },
      terms: [
        { term: '후보 키(Candidate Key)', desc: '유일성과 최소성을 모두 만족하는 속성 집합.' },
        { term: '외래 키(Foreign Key)', desc: '다른 테이블의 키를 참조해 두 테이블을 연결하는 속성.' },
        { term: '참조 무결성', desc: '외래 키가 존재하지 않는 대상을 가리키지 못하게 하는 제약.' }
      ],
      pitfall: '외래 키는 NULL을 허용할 수 있고 중복도 될 수 있다. 유일하고 NULL 불가인 것은 기본 키의 조건이다.',
      quiz: [
        {
          q: '{학번}과 {주민번호}가 각각 학생을 유일하게 구별한다. {학번, 이름}은 무엇인가?',
          choices: ['후보 키', '슈퍼 키이지만 후보 키는 아님', '외래 키', '키가 아님'],
          answer: 1,
          why: '{학번, 이름}도 유일하게 구별하지만 이름을 빼도 유일하므로 최소성을 만족하지 않는다. 따라서 슈퍼 키일 뿐이다.'
        },
        {
          q: '참조 무결성을 위반하는 상황은?',
          choices: ['주문의 customer_id가 고객 테이블에 없는 값', '고객 이름이 중복됨', '주문 금액이 0보다 큼', '고객 테이블에 주문이 없는 고객이 있음'],
          answer: 0,
          why: '외래 키가 참조 대상에 없는 값을 가지면 참조 무결성 위반이다. 주문이 없는 고객은 문제가 아니다.'
        },
        {
          q: '기본 키에 대한 설명으로 옳은 것은?',
          choices: ['NULL을 한 번은 허용한다', '반드시 단일 속성이어야 한다', 'NULL일 수 없고 값이 유일해야 한다', '다른 테이블을 반드시 참조해야 한다'],
          answer: 2,
          why: '개체 무결성에 따라 기본 키는 NULL 불가, 유일해야 한다. 여러 속성을 묶은 복합 키도 가능하다.'
        }
      ]
    },
    {
      id: 'database-04',
      title: 'SQL 기본: SELECT',
      minutes: 5,
      oneLiner: '원하는 행을 걸러 내고(WHERE), 원하는 열만 골라(SELECT), 정렬해(ORDER BY) 돌려받는 질의.',
      analogy: '도서관 검색대에 "2020년 이후 출간된 소설의 제목과 저자만, 최신순으로"라고 주문하는 것과 같다. 어떻게 찾을지는 말하지 않고 무엇을 원하는지만 말한다. SQL은 이런 선언형 언어다.',
      points: [
        '기본 형태는 `SELECT 열 FROM 테이블 WHERE 조건 ORDER BY 열`이다.',
        '작성 순서와 달리 논리적 처리 순서는 **FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT**다.',
        '조건에는 `=`, `BETWEEN`, `IN`, `LIKE \'김%\'` 등을 쓴다. `%`는 임의 길이 문자열, `_`는 한 글자다.',
        'NULL은 "모르는 값"이라 `= NULL`은 참이 되지 않는다. 반드시 `IS NULL` / `IS NOT NULL`을 쓴다.',
        '`DISTINCT`는 결과의 중복 행을 없애고, `LIMIT`(또는 `FETCH FIRST`)은 개수를 자른다.'
      ],
      example: {
        caption: '2020년 이후 소설을 최신순으로 5권',
        lang: 'sql',
        code: "SELECT title, author\nFROM book\nWHERE genre = '소설'\n  AND published >= 2020\n  AND author IS NOT NULL\nORDER BY published DESC\nLIMIT 5;"
      },
      terms: [
        { term: '선언형 언어', desc: '절차가 아니라 원하는 결과를 기술하는 언어. 실행 방법은 DBMS가 정한다.' },
        { term: 'NULL', desc: '값이 없거나 알 수 없음을 뜻하는 표시. 비교 결과는 UNKNOWN이 된다.' }
      ],
      pitfall: 'SELECT 절에서 만든 별칭은 WHERE가 SELECT보다 먼저 처리되므로 대부분의 DBMS에서 WHERE에 쓸 수 없다.',
      quiz: [
        {
          q: 'email이 비어 있는(NULL) 회원을 찾는 올바른 조건은?',
          choices: ['WHERE email = NULL', "WHERE email = ''", 'WHERE email IS NULL', 'WHERE email == NULL'],
          answer: 2,
          why: 'NULL과의 = 비교는 UNKNOWN이 되어 걸러지지 않는다. IS NULL을 써야 한다.'
        },
        {
          q: 'SELECT 문의 논리적 처리 순서에서 WHERE 바로 다음에 오는 것은?',
          choices: ['SELECT', 'ORDER BY', 'HAVING', 'GROUP BY'],
          answer: 3,
          why: 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY 순이다.'
        },
        {
          q: "`name LIKE '김_'`에 일치하는 값은?",
          choices: ['김', '김하', '김하나', '이김'],
          answer: 1,
          why: '_는 정확히 한 글자를 뜻하므로 "김" 뒤에 한 글자만 있는 "김하"가 일치한다.'
        }
      ]
    },
    {
      id: 'database-05',
      title: 'JOIN',
      minutes: 5,
      oneLiner: '공통 값을 기준으로 두 테이블의 행을 짝지어 하나의 결과로 합치는 연산.',
      analogy: '반 명단과 동아리 가입표를 학번으로 맞대어 보는 일이다. 양쪽 다 있는 학생만 뽑으면 INNER JOIN, 동아리가 없어도 반 명단의 모든 학생을 남기고 빈칸으로 두면 LEFT JOIN이다.',
      points: [
        '**INNER JOIN**은 조건을 만족하는 짝이 양쪽에 모두 있는 행만 남긴다.',
        '**LEFT (OUTER) JOIN**은 왼쪽 테이블의 모든 행을 남기고, 짝이 없으면 오른쪽 열을 NULL로 채운다. RIGHT, FULL OUTER도 같은 원리다.',
        '**CROSS JOIN**은 모든 행의 조합(카티션 곱)을 만든다. 3행과 4행이면 12행이다.',
        '조인 조건은 보통 **외래 키 = 기본 키**로 건다. 조건을 빠뜨리면 의도치 않은 카티션 곱이 된다.',
        '**셀프 조인**은 같은 테이블을 별칭 두 개로 조인한다. 직원과 그 상사처럼 자기 참조 관계에 쓴다.'
      ],
      example: {
        caption: '주문이 없는 고객도 포함해 고객별 주문 보기',
        lang: 'sql',
        code: 'SELECT c.name, o.id AS order_id, o.amount\nFROM customer c\nLEFT JOIN orders o\n  ON o.customer_id = c.id\nORDER BY c.name;\n-- 주문 없는 고객은 order_id, amount가 NULL'
      },
      terms: [
        { term: '외부 조인(Outer Join)', desc: '짝이 없는 행도 NULL로 채워 결과에 남기는 조인.' },
        { term: '카티션 곱(Cartesian Product)', desc: '두 집합의 모든 원소 쌍. 조인 조건이 없을 때의 결과.' }
      ],
      pitfall: 'LEFT JOIN 뒤 WHERE에 오른쪽 테이블 조건(예: `o.amount > 0`)을 걸면 NULL 행이 걸러져 사실상 INNER JOIN이 된다. 그런 조건은 ON 절에 둔다.',
      quiz: [
        {
          q: '고객 10명 중 3명은 주문이 없다. `customer LEFT JOIN orders`의 결과에 대한 설명으로 옳은 것은?',
          choices: ['주문 없는 3명은 결과에서 빠진다', '주문 없는 3명도 주문 열이 NULL인 채로 포함된다', '결과는 항상 정확히 10행이다', '주문 테이블의 모든 행이 NULL이 된다'],
          answer: 1,
          why: 'LEFT JOIN은 왼쪽 행을 모두 남긴다. 주문이 여러 건인 고객은 여러 행이 되므로 결과가 꼭 10행은 아니다.'
        },
        {
          q: '5행 테이블과 4행 테이블을 조건 없이 조인하면 몇 행이 나오는가?',
          choices: ['9', '5', '4', '20'],
          answer: 3,
          why: '조건이 없으면 카티션 곱이 되어 5 × 4 = 20행이다.'
        }
      ]
    },
    {
      id: 'database-06',
      title: '집계와 GROUP BY',
      minutes: 5,
      oneLiner: '행들을 같은 값끼리 묶은 뒤 묶음마다 개수, 합계, 평균 같은 요약값을 계산하는 기능.',
      analogy: '영수증 더미를 가게 이름별로 봉투에 나눠 담고, 봉투마다 총액을 적는 일이다. WHERE는 봉투에 넣기 전에 영수증을 버리는 것이고, HAVING은 다 계산한 뒤 총액이 작은 봉투를 버리는 것이다.',
      points: [
        '집계 함수는 `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`가 대표적이다.',
        '`GROUP BY`를 쓰면 SELECT에는 **그룹 기준 열과 집계 함수만** 올 수 있다. 그룹 안에서 값이 하나로 정해지지 않기 때문이다.',
        '**WHERE**는 그룹을 만들기 전 행을 거르고, **HAVING**은 그룹을 만든 뒤 집계 결과로 거른다.',
        '`COUNT(*)`는 모든 행을 세지만 `COUNT(열)`은 그 열이 NULL인 행을 빼고 센다. `AVG`, `SUM`도 NULL을 무시한다.'
      ],
      example: {
        caption: '2025년 주문 기준, 총액 10만 원 이상인 고객',
        lang: 'sql',
        code: "SELECT customer_id,\n       COUNT(*)    AS cnt,\n       SUM(amount) AS total\nFROM orders\nWHERE ordered_at >= '2025-01-01'\nGROUP BY customer_id\nHAVING SUM(amount) >= 100000\nORDER BY total DESC;"
      },
      terms: [
        { term: '집계 함수(Aggregate Function)', desc: '여러 행을 받아 값 하나를 돌려주는 함수.' },
        { term: 'HAVING', desc: '그룹화 이후 집계 결과에 조건을 거는 절.' }
      ],
      pitfall: '집계 함수는 WHERE에 쓸 수 없다. `WHERE SUM(amount) > 100`은 오류이며 HAVING으로 옮겨야 한다.',
      quiz: [
        {
          q: 'score 열에 10, NULL, 20이 있다. `COUNT(*)`, `COUNT(score)`, `AVG(score)`의 결과는?',
          choices: ['3, 2, 15', '3, 3, 10', '2, 2, 15', '3, 2, 10'],
          answer: 0,
          why: 'COUNT(*)는 3, COUNT(score)는 NULL을 빼고 2, AVG는 NULL을 무시하고 (10+20)/2 = 15다.'
        },
        {
          q: '부서별 평균 급여가 500 이상인 부서만 보려면 조건을 어디에 두는가?',
          choices: ['WHERE AVG(salary) >= 500', 'ORDER BY AVG(salary) >= 500', 'HAVING AVG(salary) >= 500', 'SELECT 절의 CASE 문'],
          answer: 2,
          why: '그룹별 집계 결과에 거는 조건은 HAVING에 둔다.'
        },
        {
          q: '`SELECT dept, name, COUNT(*) FROM emp GROUP BY dept;`가 표준 SQL에서 오류인 이유는?',
          choices: ['COUNT(*)는 GROUP BY와 함께 쓸 수 없다', 'dept가 기본 키가 아니다', 'ORDER BY가 빠졌다', 'name이 그룹 기준도 집계 함수도 아니다'],
          answer: 3,
          why: '한 부서 안에 이름이 여럿이라 어떤 값을 보여 줄지 정해지지 않는다.'
        }
      ]
    },
    {
      id: 'database-07',
      title: 'ER 모델링',
      minutes: 5,
      oneLiner: '현실 세계를 개체, 속성, 관계로 그려 테이블 설계의 밑그림을 만드는 방법.',
      analogy: '집을 짓기 전 그리는 평면도와 같다. 방(개체)과 방에 딸린 창문, 크기(속성), 방을 잇는 문(관계)을 먼저 그려 보면 공사(테이블 생성) 전에 구조적 실수를 잡을 수 있다.',
      points: [
        '**개체(Entity)**는 저장할 대상(학생, 강의), **속성(Attribute)**은 그 특징(이름, 학점), **관계(Relationship)**는 개체 사이 연관(수강)이다.',
        '관계의 **카디널리티**는 1:1, 1:N, M:N으로 표시한다. 고객과 주문은 1:N, 학생과 강의는 M:N이다.',
        '테이블로 바꿀 때 1:N은 **N쪽에 외래 키**를 둔다.',
        'M:N은 외래 키 하나로 표현할 수 없어 **연결 테이블**(예: 수강)을 따로 만들고, 양쪽 키를 외래 키로 가진다.',
        '자기 키만으로 구별되지 않고 다른 개체에 기대는 개체를 **약한 개체**라 한다. 주문에 딸린 주문 항목이 예다.'
      ],
      example: {
        caption: '학생-강의 M:N 관계를 연결 테이블로 구현',
        lang: 'sql',
        code: 'CREATE TABLE enrollment (\n  student_id INT REFERENCES student(id),\n  course_id  INT REFERENCES course(id),\n  grade      CHAR(2),\n  PRIMARY KEY (student_id, course_id)\n);'
      },
      terms: [
        { term: 'ERD', desc: '개체-관계 모델을 그림으로 표현한 다이어그램.' },
        { term: '카디널리티(관계)', desc: '한 개체가 상대 개체 몇 개와 관계를 맺을 수 있는지에 대한 비율.' },
        { term: '연결 테이블(Junction Table)', desc: 'M:N 관계를 두 개의 1:N으로 풀기 위한 중간 테이블.' }
      ],
      pitfall: '관계 자체에 속한 속성(예: 성적)은 학생이나 강의가 아니라 연결 테이블에 둬야 한다.',
      quiz: [
        {
          q: '고객(1)과 주문(N) 관계를 테이블로 옮길 때 외래 키는 어디에 두는가?',
          choices: ['주문 테이블에 고객 ID', '고객 테이블에 주문 ID', '양쪽 모두에 서로의 ID', '별도 연결 테이블이 반드시 필요'],
          answer: 0,
          why: '1:N에서는 N쪽(주문)이 1쪽(고객)의 키를 외래 키로 가진다.'
        },
        {
          q: '학생과 강의의 M:N 관계를 구현하는 일반적인 방법은?',
          choices: ['학생 테이블에 강의 ID 열을 여러 개 추가', '연결 테이블을 만들어 두 개의 1:N으로 분해', '강의 테이블에 학생 이름을 쉼표로 이어 저장', '두 테이블을 하나로 합침'],
          answer: 1,
          why: '연결 테이블에 (학생 ID, 강의 ID)를 두면 원자값을 유지하며 M:N을 표현할 수 있다.'
        }
      ]
    },
    {
      id: 'database-08',
      title: '정규화',
      minutes: 6,
      oneLiner: '함수 종속을 기준으로 테이블을 쪼개 중복과 그로 인한 이상 현상을 없애는 설계 과정.',
      analogy: '연락처 수첩의 모든 메모에 친구 주소를 매번 다시 적으면, 친구가 이사할 때 수십 군데를 고쳐야 하고 하나만 빠뜨려도 정보가 어긋난다. 주소는 연락처 한 곳에만 쓰고 메모에는 이름만 적는 것이 정규화다.',
      points: [
        '중복이 있으면 **삽입 이상**(불필요한 정보 없이는 넣을 수 없음), **갱신 이상**(일부만 고쳐져 불일치), **삭제 이상**(지우면 다른 정보까지 사라짐)이 생긴다.',
        '**함수 종속(Functional Dependency)** `X → Y`는 X 값이 정해지면 Y 값이 하나로 정해진다는 뜻이다.',
        '**1NF**: 모든 값이 원자값. **2NF**: 1NF이고 기본 키의 일부에만 종속되는 **부분 종속**이 없음.',
        '**3NF**: 2NF이고 키가 아닌 속성을 거쳐 종속되는 **이행 종속**이 없음. **BCNF**: 모든 결정자가 후보 키.',
        '분해는 **무손실**(조인하면 원래대로 복원)이어야 한다. 조회 성능을 위해 일부러 중복을 두는 **반정규화**도 있다.'
      ],
      example: {
        caption: '이행 종속 제거: 학번 → 학과 → 학과장',
        lang: 'text',
        code: '정규화 전  학생(학번, 이름, 학과, 학과장)\n           학번 → 학과, 학과 → 학과장 (이행 종속)\n\n3NF 분해   학생(학번, 이름, 학과)\n           학과(학과, 학과장)\n\n학과장이 바뀌면 학과 테이블 한 행만 고치면 된다.'
      },
      terms: [
        { term: '함수 종속(FD)', desc: '한 속성 집합의 값이 다른 속성 값을 유일하게 결정하는 관계.' },
        { term: '이행 종속', desc: 'X → Y, Y → Z가 성립해 X → Z가 간접적으로 성립하는 종속.' },
        { term: '반정규화(Denormalization)', desc: '성능을 위해 의도적으로 중복을 허용하는 설계.' }
      ],
      pitfall: '정규화를 많이 할수록 무조건 좋은 것은 아니다. 테이블이 잘게 쪼개지면 조인이 늘어 읽기가 느려질 수 있다.',
      quiz: [
        {
          q: '수강(학번, 과목코드, 성적, 학생이름)에서 기본 키가 (학번, 과목코드)일 때 2NF를 위반하는 이유는?',
          choices: ['성적이 원자값이 아니다', '학생이름이 키의 일부인 학번에만 종속된다', '과목코드가 NULL일 수 있다', '이행 종속이 있다'],
          answer: 1,
          why: '학생이름은 학번만으로 결정되므로 기본 키에 부분 종속한다. 이것이 2NF 위반이다.'
        },
        {
          q: '같은 학과장 이름이 수백 행에 반복되어, 하나를 고칠 때 일부 행이 누락되는 문제는?',
          choices: ['삽입 이상', '삭제 이상', '갱신 이상', '팬텀 읽기'],
          answer: 2,
          why: '중복 저장된 값 중 일부만 바뀌어 불일치가 생기는 것이 갱신 이상이다.'
        },
        {
          q: 'BCNF의 조건으로 옳은 것은?',
          choices: ['모든 결정자가 후보 키여야 한다', '모든 속성이 숫자형이어야 한다', '테이블마다 외래 키가 하나 이상 있어야 한다', '기본 키는 단일 속성이어야 한다'],
          answer: 0,
          why: 'BCNF는 3NF보다 강한 조건으로, 함수 종속의 모든 결정자가 후보 키여야 한다.'
        }
      ]
    },
    {
      id: 'database-09',
      title: '트랜잭션과 ACID',
      minutes: 5,
      oneLiner: '함께 성공하거나 함께 실패해야 하는 작업 묶음과, 그것이 지켜야 할 네 가지 성질.',
      analogy: '계좌 이체는 내 통장에서 빼기와 상대 통장에 넣기가 한 세트다. 빼기만 되고 넣기 전에 정전이 나면 돈이 증발한다. 트랜잭션은 이 두 동작을 "전부 아니면 전무"로 묶는 봉투다.',
      points: [
        '**트랜잭션(Transaction)**은 논리적으로 한 단위인 연산들의 묶음이다. `COMMIT`으로 확정하고 `ROLLBACK`으로 취소한다.',
        '**원자성(Atomicity)**: 전부 반영되거나 전혀 반영되지 않는다.',
        '**일관성(Consistency)**: 트랜잭션 전후로 무결성 제약 같은 규칙이 지켜진다.',
        '**격리성(Isolation)**: 동시에 실행되는 트랜잭션이 서로의 중간 상태를 보지 않는다(정도는 격리 수준으로 조절).',
        '**지속성(Durability)**: 커밋된 결과는 장애가 나도 사라지지 않는다. 보통 로그를 디스크에 먼저 기록해 보장한다.'
      ],
      example: {
        caption: '이체: 둘 다 성공해야 COMMIT',
        lang: 'sql',
        code: 'BEGIN;\nUPDATE account SET balance = balance - 10000\n WHERE id = 1;\nUPDATE account SET balance = balance + 10000\n WHERE id = 2;\nCOMMIT;\n-- 중간에 오류가 나면 ROLLBACK으로 둘 다 취소'
      },
      terms: [
        { term: 'COMMIT', desc: '트랜잭션의 변경을 확정해 영구 반영하는 명령.' },
        { term: 'ROLLBACK', desc: '트랜잭션의 변경을 모두 취소하고 시작 전 상태로 되돌리는 명령.' },
        { term: 'ACID', desc: '원자성, 일관성, 격리성, 지속성의 머리글자.' }
      ],
      pitfall: '많은 DBMS는 자동 커밋(autocommit)이 기본이라 BEGIN 없이 쓴 UPDATE 두 개는 각각 따로 커밋된다.',
      quiz: [
        {
          q: '커밋 직후 서버 전원이 나갔는데 재시작 후에도 변경이 남아 있다. 어떤 성질 덕분인가?',
          choices: ['원자성', '일관성', '격리성', '지속성'],
          answer: 3,
          why: '커밋된 결과가 장애 후에도 유지되는 것은 지속성이다.'
        },
        {
          q: '이체 중 출금만 반영되고 입금이 실패했을 때 출금까지 취소되는 것은 어떤 성질 때문인가?',
          choices: ['원자성', '지속성', '격리성', '독립성'],
          answer: 0,
          why: '원자성은 트랜잭션의 연산이 전부 반영되거나 전혀 반영되지 않게 한다.'
        }
      ]
    },
    {
      id: 'database-10',
      title: '격리 수준과 이상 현상',
      minutes: 6,
      oneLiner: '동시 실행 트랜잭션이 서로를 얼마나 볼 수 있는지 정하는 단계와, 단계별로 생길 수 있는 문제.',
      analogy: '공유 문서를 여러 명이 동시에 고친다고 하자. 남이 아직 저장하지 않은 초안까지 보면 빠르지만 헷갈리고, 문서를 통째로 잠그고 한 명씩 쓰면 정확하지만 줄을 서야 한다. 격리 수준은 그 사이 어디쯤에 설지 고르는 다이얼이다.',
      points: [
        '**Dirty Read**: 다른 트랜잭션이 커밋하지 않은 값을 읽는다. 그 트랜잭션이 롤백하면 존재하지 않던 값을 본 셈이다.',
        '**Non-Repeatable Read**: 같은 행을 두 번 읽었는데 그 사이 다른 트랜잭션의 커밋으로 값이 바뀌어 있다.',
        '**Phantom Read**: 같은 조건으로 두 번 조회했는데 그 사이 삽입, 삭제로 행의 집합이 달라진다.',
        'SQL 표준 격리 수준: **READ UNCOMMITTED**(셋 다 가능) → **READ COMMITTED**(Dirty Read 방지) → **REPEATABLE READ**(Non-Repeatable Read도 방지) → **SERIALIZABLE**(Phantom까지 방지).',
        '수준이 높을수록 안전하지만 대기와 충돌이 늘어 처리량이 줄어든다. 기본값은 PostgreSQL이 READ COMMITTED, MySQL InnoDB가 REPEATABLE READ다.'
      ],
      example: {
        caption: '두 세션에서 일어나는 Non-Repeatable Read (READ COMMITTED)',
        lang: 'sql',
        code: '-- 세션 A\nBEGIN;\nSELECT balance FROM account WHERE id = 1; -- 100\n\n-- 세션 B\nUPDATE account SET balance = 50 WHERE id = 1;\nCOMMIT;\n\n-- 세션 A\nSELECT balance FROM account WHERE id = 1; -- 50'
      },
      terms: [
        { term: '격리 수준(Isolation Level)', desc: '동시 트랜잭션 간 간섭을 어디까지 허용할지 정한 단계.' },
        { term: '직렬 가능성(Serializability)', desc: '동시 실행 결과가 어떤 순서로 하나씩 실행한 결과와 같다는 성질.' }
      ],
      pitfall: '표준상 REPEATABLE READ에서도 팬텀은 생길 수 있다. 실제 동작은 DBMS 구현(MVCC, 갭 락 등)에 따라 다르니 문서를 확인해야 한다.',
      quiz: [
        {
          q: '롤백될 수도 있는, 커밋되지 않은 값을 읽는 현상은?',
          choices: ['Phantom Read', 'Dirty Read', 'Non-Repeatable Read', 'Lost Update'],
          answer: 1,
          why: '커밋되지 않은 데이터를 읽는 것이 Dirty Read다.'
        },
        {
          q: '`WHERE age > 30`으로 두 번 조회했더니 두 번째에 새 행이 하나 더 나왔다. 이 현상은?',
          choices: ['Dirty Read', 'Non-Repeatable Read', 'Deadlock', 'Phantom Read'],
          answer: 3,
          why: '다른 트랜잭션의 삽입으로 조건에 맞는 행 집합이 달라진 것은 Phantom Read다.'
        },
        {
          q: 'SQL 표준에서 Dirty Read는 막지만 Non-Repeatable Read는 허용하는 수준은?',
          choices: ['READ UNCOMMITTED', 'REPEATABLE READ', 'READ COMMITTED', 'SERIALIZABLE'],
          answer: 2,
          why: 'READ COMMITTED는 커밋된 값만 읽지만, 읽을 때마다 최신 커밋 값을 보므로 반복 읽기 결과가 달라질 수 있다.'
        }
      ]
    },
    {
      id: 'database-11',
      title: '락과 동시성 제어 (2PL, MVCC)',
      minutes: 6,
      oneLiner: '동시에 실행되는 트랜잭션이 서로의 결과를 망치지 않도록 접근 순서를 조율하는 기법.',
      analogy: '도서관 책을 생각하자. 여러 명이 같이 열람하는 것은 괜찮지만(공유 락), 누군가 책에 필기하는 동안에는 아무도 못 본다(배타 락). MVCC는 필기하는 사람에게 복사본을 주고, 다른 사람은 원본을 계속 읽게 하는 방식이다.',
      points: [
        '**공유 락(S, Shared)**은 읽기용으로 여러 트랜잭션이 함께 잡을 수 있고, **배타 락(X, Exclusive)**은 쓰기용으로 혼자만 잡는다. S와 X, X와 X는 충돌한다.',
        '**2단계 락킹(2PL)**: 락을 얻기만 하는 **확장 단계**와 풀기만 하는 **축소 단계**로 나눈다. 한 번 풀면 다시 얻지 않으며, 이 규칙으로 직렬 가능성이 보장된다.',
        '**Strict 2PL**은 배타 락을 커밋이나 롤백 때까지 유지해, 남의 미확정 값을 읽고 줄줄이 롤백되는 **연쇄 철회**를 막는다.',
        '락은 **교착 상태(Deadlock)**를 부를 수 있다. DBMS는 대기 그래프로 사이클을 찾아 한 트랜잭션을 희생시켜 롤백한다.',
        '**MVCC(다중 버전 동시성 제어)**는 쓰기 때마다 새 버전을 만들고 읽기는 시작 시점의 스냅샷을 본다. 그래서 **읽기와 쓰기가 서로 막지 않는다**.'
      ],
      example: {
        caption: '교착 상태가 생기는 순서',
        lang: 'sql',
        code: '-- T1\nUPDATE account SET balance = balance - 10 WHERE id = 1;\n-- T2\nUPDATE account SET balance = balance - 10 WHERE id = 2;\n-- T1: id=2의 X 락을 기다림\nUPDATE account SET balance = balance + 10 WHERE id = 2;\n-- T2: id=1의 X 락을 기다림 -> 교착 상태\nUPDATE account SET balance = balance + 10 WHERE id = 1;'
      },
      terms: [
        { term: '2PL(Two-Phase Locking)', desc: '락 획득 단계와 해제 단계를 분리해 직렬 가능성을 보장하는 규약.' },
        { term: '교착 상태(Deadlock)', desc: '트랜잭션들이 서로가 가진 락을 기다리며 영원히 진행하지 못하는 상태.' },
        { term: 'MVCC', desc: '데이터의 여러 버전을 유지해 읽기가 쓰기를 기다리지 않게 하는 기법.' }
      ],
      pitfall: '2PL은 직렬 가능성을 보장하지만 교착 상태를 막아 주지는 않는다. 락을 항상 같은 순서로 잡으면 교착을 줄일 수 있다.',
      quiz: [
        {
          q: 'T1이 어떤 행에 공유 락(S)을 잡고 있다. 다른 트랜잭션이 바로 얻을 수 있는 락은?',
          choices: ['공유 락(S)', '배타 락(X)', 'S와 X 모두', '아무 락도 얻을 수 없다'],
          answer: 0,
          why: 'S 락끼리는 호환되지만 S와 X는 충돌하므로 배타 락은 기다려야 한다.'
        },
        {
          q: '2PL의 축소 단계에 들어간 트랜잭션에 대한 설명으로 옳은 것은?',
          choices: ['새 락을 계속 얻을 수 있다', '모든 락을 즉시 반납해야 한다', '더 이상 새 락을 얻을 수 없다', '읽기 락만 새로 얻을 수 있다'],
          answer: 2,
          why: '락을 하나라도 풀면 축소 단계이며, 이후에는 어떤 락도 새로 얻지 않는다.'
        },
        {
          q: 'MVCC의 가장 큰 장점은?',
          choices: ['저장 공간을 전혀 더 쓰지 않는다', '교착 상태가 원천적으로 생기지 않는다', '모든 격리 이상이 자동으로 사라진다', '읽기가 쓰기 락을 기다리지 않는다'],
          answer: 3,
          why: '읽기는 스냅샷 버전을 보므로 쓰기와 서로 막지 않는다. 대신 옛 버전을 저장하고 정리하는 비용이 든다.'
        }
      ]
    },
    {
      id: 'database-12',
      title: '인덱스와 B+트리',
      minutes: 6,
      oneLiner: '원하는 행을 전체를 훑지 않고 빠르게 찾도록 키를 정렬해 둔 별도의 자료 구조.',
      analogy: '두꺼운 전공서 맨 뒤의 색인과 같다. "교착 상태 → 212쪽"을 보고 바로 펼치면 첫 장부터 넘길 필요가 없다. 대신 책 내용이 바뀌면 색인도 같이 고쳐야 한다.',
      points: [
        '인덱스가 없으면 **전체 테이블 스캔(Full Scan)**으로 모든 행을 읽어야 한다. 인덱스가 있으면 **O(log n)**에 찾는다.',
        '대부분의 DBMS는 **B+트리**를 쓴다. 내부 노드는 길 안내용 키만, **리프 노드에 실제 데이터(또는 행 위치)**를 두며, 리프끼리 연결 리스트로 이어져 있어 **범위 검색**이 빠르다.',
        '한 노드가 디스크 페이지 하나라 자식을 수백 개 가질 수 있다. 그래서 수억 행도 높이 3~4 정도로, 디스크 접근 몇 번이면 찾는다.',
        '**클러스터형 인덱스**는 테이블 행 자체를 키 순서로 저장하므로 테이블당 하나다. 나머지는 **보조(비클러스터형) 인덱스**다.',
        '**복합 인덱스** (a, b)는 a로 먼저 정렬된다. 따라서 `WHERE b = ?`만으로는 잘 쓰이지 않는다(**왼쪽 접두사 규칙**).'
      ],
      example: {
        caption: '복합 인덱스와 활용 여부',
        lang: 'sql',
        code: "CREATE INDEX idx_city_age ON member(city, age);\n\n-- 인덱스 사용 가능\nSELECT * FROM member WHERE city = '서울' AND age > 30;\nSELECT * FROM member WHERE city = '부산';\n\n-- 선두 열(city)이 없어 효율적으로 쓰기 어려움\nSELECT * FROM member WHERE age > 30;"
      },
      terms: [
        { term: 'B+트리', desc: '모든 데이터를 리프에 두고 리프를 연결한 균형 탐색 트리.' },
        { term: '클러스터형 인덱스', desc: '행의 물리적 저장 순서를 키 순서와 일치시킨 인덱스.' },
        { term: '선택도(Selectivity)', desc: '조건을 만족하는 행의 비율. 낮을수록(소수 행만 고를수록) 인덱스가 유리하다.' }
      ],
      pitfall: '인덱스는 공짜가 아니다. INSERT, UPDATE, DELETE마다 인덱스도 갱신해야 해서 쓰기가 느려지고 저장 공간도 든다.',
      quiz: [
        {
          q: 'B+트리가 B트리보다 범위 검색(`BETWEEN`)에 유리한 이유는?',
          choices: ['내부 노드에 모든 데이터를 저장해서', '리프 노드들이 순서대로 연결되어 있어서', '해시 함수로 위치를 바로 계산해서', '트리 높이가 항상 1이라서'],
          answer: 1,
          why: '시작 키의 리프를 찾은 뒤 연결된 리프를 따라가며 순서대로 읽으면 된다.'
        },
        {
          q: '인덱스 (last_name, first_name)이 있을 때 이 인덱스를 가장 잘 활용하는 조건은?',
          choices: ["WHERE first_name = '하나'", "WHERE last_name LIKE '%김'", "WHERE last_name = '김' AND first_name = '하나'", "WHERE UPPER(first_name) = 'HANA'"],
          answer: 2,
          why: '선두 열부터 등호로 조건이 걸려야 정렬 순서를 그대로 탐색할 수 있다. 앞에 %가 붙은 LIKE나 열에 함수를 씌운 조건은 탐색에 쓰기 어렵다.'
        }
      ]
    },
    {
      id: 'database-13',
      title: '쿼리 처리와 실행 계획',
      minutes: 5,
      oneLiner: 'SQL을 파싱하고, 가능한 실행 방법 중 비용이 가장 낮은 계획을 골라 실행하는 과정.',
      analogy: '내비게이션에 목적지만 입력하면 여러 경로의 예상 시간을 따져 가장 빠른 길을 고른다. SQL이 목적지이고, 옵티마이저가 내비게이션이며, 테이블 통계가 교통 정보다.',
      points: [
        '처리 단계는 **파싱**(문법, 이름 확인) → **최적화**(실행 계획 선택) → **실행**이다.',
        '**비용 기반 옵티마이저**는 행 수, 값 분포 같은 **통계**로 각 계획의 디스크 I/O와 CPU 비용을 추정한다.',
        '조인 알고리즘은 **중첩 루프 조인**(한쪽이 작고 인덱스가 있을 때), **해시 조인**(큰 테이블 등호 조인), **정렬 병합 조인**(이미 정렬되어 있을 때)이 대표적이다.',
        '`EXPLAIN`으로 옵티마이저가 고른 계획을 볼 수 있다. Full Scan인지 Index Scan인지, 조인 순서와 방식이 무엇인지 확인한다.',
        '통계가 오래되면 행 수를 잘못 추정해 나쁜 계획을 고른다. 대량 변경 뒤에는 `ANALYZE`로 통계를 갱신한다.'
      ],
      example: {
        caption: 'PostgreSQL에서 실행 계획 확인',
        lang: 'sql',
        code: "EXPLAIN\nSELECT c.name, o.amount\nFROM customer c\nJOIN orders o ON o.customer_id = c.id\nWHERE c.city = '서울';\n-- 출력 예: Hash Join\n--   -> Seq Scan on orders o\n--   -> Hash\n--        -> Index Scan using idx_city on customer c"
      },
      terms: [
        { term: '옵티마이저(Optimizer)', desc: '여러 실행 계획 중 비용이 가장 낮은 것을 고르는 DBMS 구성 요소.' },
        { term: '실행 계획(Execution Plan)', desc: '테이블 접근 방식, 조인 순서와 알고리즘을 정한 구체적 실행 절차.' },
        { term: '해시 조인(Hash Join)', desc: '한쪽 테이블로 해시 테이블을 만들고 다른 쪽을 훑으며 짝을 찾는 조인.' }
      ],
      pitfall: '인덱스가 있다고 항상 쓰이지는 않는다. 테이블 대부분을 읽어야 하면 옵티마이저는 오히려 Full Scan을 고른다.',
      quiz: [
        {
          q: '비용 기반 옵티마이저가 계획을 고를 때 주로 참고하는 것은?',
          choices: ['테이블과 열의 통계 정보', 'SQL을 작성한 사람의 권한', '쿼리 문자열의 길이', '테이블이 만들어진 날짜'],
          answer: 0,
          why: '행 수, 고유값 수, 분포 같은 통계로 각 계획의 비용을 추정한다.'
        },
        {
          q: '인덱스가 없는 두 대형 테이블을 등호 조건으로 조인할 때 흔히 선택되는 방식은?',
          choices: ['인덱스 중첩 루프 조인', '카티션 곱 후 필터링', '해시 조인', '전체 테이블 잠금 조인'],
          answer: 2,
          why: '등호 조인이고 인덱스가 없으면 한쪽으로 해시 테이블을 만드는 해시 조인이 효율적이다.'
        },
        {
          q: '쿼리가 갑자기 느려졌을 때 실제 실행 방식을 확인하는 첫 단계로 알맞은 것은?',
          choices: ['DBMS 재설치', 'EXPLAIN으로 실행 계획 확인', '모든 열에 인덱스 추가', '격리 수준을 SERIALIZABLE로 변경'],
          answer: 1,
          why: 'EXPLAIN으로 Full Scan 여부, 조인 방식, 추정 행 수를 먼저 보고 원인을 좁힌다.'
        }
      ]
    },
    {
      id: 'database-14',
      title: '로그와 장애 복구',
      minutes: 6,
      oneLiner: '변경 내용을 로그에 먼저 기록해 두고, 장애 후 그 로그로 커밋된 것은 다시 하고 미완료된 것은 되돌리는 방법.',
      analogy: '가계부를 쓰는 사람이 지갑에서 돈을 꺼내기 전에 "식비 만 원" 메모부터 남기는 습관과 같다. 중간에 정신이 없어져도 메모를 보면 어디까지 했는지 정확히 복원할 수 있다.',
      points: [
        '**WAL(Write-Ahead Logging)**: 데이터 페이지를 디스크에 쓰기 전에, 그 변경을 담은 **로그를 먼저** 디스크에 기록한다.',
        '커밋은 **로그가 디스크에 기록되면** 완료로 본다. 데이터 페이지는 나중에 써도 된다. 무작위 쓰기 대신 순차 로그 쓰기만 하므로 빠르다.',
        '재시작 시 커밋된 트랜잭션의 변경은 **REDO**(다시 적용), 커밋되지 않은 트랜잭션의 변경은 **UNDO**(취소)한다.',
        '**체크포인트(Checkpoint)**는 메모리의 변경 페이지를 주기적으로 디스크에 내려 두는 지점이다. 복구 때 로그를 처음부터 읽지 않아도 된다.',
        '대표 알고리즘 **ARIES**는 분석 → REDO → UNDO 세 단계로 복구한다.'
      ],
      example: {
        caption: '장애 시점의 로그와 복구 판단',
        lang: 'text',
        code: '[T1 BEGIN]\n[T1 UPDATE A: 100 -> 90]\n[T2 BEGIN]\n[T2 UPDATE B: 50 -> 70]\n[T1 COMMIT]\n--- 장애 발생 ---\n\nT1: COMMIT 기록 있음 -> REDO (A = 90 보장)\nT2: COMMIT 기록 없음 -> UNDO (B = 50 복원)'
      },
      terms: [
        { term: 'WAL', desc: '데이터보다 로그를 먼저 안정 저장소에 쓰는 규칙.' },
        { term: 'REDO / UNDO', desc: '커밋된 변경을 재적용 / 미완료 변경을 이전 값으로 되돌리는 복구 동작.' },
        { term: '체크포인트(Checkpoint)', desc: '복구 시작 지점을 앞당기기 위해 상태를 디스크에 반영해 두는 시점.' }
      ],
      pitfall: '커밋했다고 데이터 파일에 바로 쓰인 것은 아니다. 지속성은 데이터 파일이 아니라 디스크에 기록된 로그가 보장한다.',
      quiz: [
        {
          q: 'WAL 규칙의 내용으로 옳은 것은?',
          choices: ['데이터 페이지를 먼저 쓰고 로그는 나중에 쓴다', '로그는 메모리에만 두고 디스크에는 쓰지 않는다', '변경 로그를 데이터 페이지보다 먼저 디스크에 쓴다', '커밋된 트랜잭션은 로그를 남기지 않는다'],
          answer: 2,
          why: '로그를 먼저 남겨야 데이터 페이지가 반쯤 쓰인 채 장애가 나도 로그로 복구할 수 있다.'
        },
        {
          q: '장애 직전 COMMIT 기록이 없는 트랜잭션은 재시작 시 어떻게 처리되는가?',
          choices: ['REDO로 다시 적용한다', '그대로 둔다', '자동으로 커밋 처리한다', 'UNDO로 변경을 되돌린다'],
          answer: 3,
          why: '원자성을 위해 커밋되지 않은 트랜잭션의 변경은 UNDO로 모두 취소한다.'
        }
      ]
    },
    {
      id: 'database-15',
      title: 'NoSQL',
      minutes: 5,
      oneLiner: '고정 스키마와 조인을 내려놓는 대신 유연한 데이터 구조와 수평 확장을 택한 비관계형 데이터베이스들.',
      analogy: '관계형 DB가 칸이 미리 정해진 서류철이라면, 문서형 NoSQL은 자유 양식 메모를 폴더째 넣는 상자다. 형식이 자유롭고 상자를 여러 개로 늘리기 쉽지만, 여러 상자를 맞대어 보는 일은 불편하다.',
      points: [
        '**키-값(Key-Value)**: 키로 값을 바로 찾는다. 캐시, 세션에 쓴다(Redis).',
        '**문서형(Document)**: JSON 같은 문서를 통째로 저장하고 필드로 조회한다(MongoDB). 관련 데이터를 한 문서에 내장해 조인을 줄인다.',
        '**와이드 컬럼(Wide-Column)**: 행마다 열 구성이 달라도 되는 대규모 분산 저장소다(Cassandra). **그래프(Graph)**: 노드와 간선으로 관계 탐색에 강하다(Neo4j).',
        '**CAP 정리**: 네트워크 분할(P)이 생기면 일관성(C)과 가용성(A) 중 하나를 포기해야 한다. 많은 NoSQL은 가용성을 택하고 **최종 일관성(Eventual Consistency)**을 제공한다.',
        '스키마가 자유로워도 설계가 사라지는 것은 아니다. **어떤 질의를 할지** 먼저 정하고 그에 맞춰 데이터를 배치한다.'
      ],
      example: {
        caption: '문서형: 주문에 항목을 내장한 문서',
        lang: 'text',
        code: '{\n  "_id": "order-1001",\n  "customer": { "id": 7, "name": "김하나" },\n  "items": [\n    { "sku": "PEN-01", "qty": 3, "price": 1500 },\n    { "sku": "NOTE-2", "qty": 1, "price": 4000 }\n  ],\n  "status": "paid"\n}'
      },
      terms: [
        { term: 'CAP 정리', desc: '분산 시스템은 네트워크 분할 시 일관성과 가용성을 동시에 완전히 보장할 수 없다는 정리.' },
        { term: '최종 일관성(Eventual Consistency)', desc: '갱신이 멈추면 시간이 지나 모든 복제본이 같은 값에 수렴한다는 보장.' }
      ],
      pitfall: 'NoSQL이 "SQL을 안 쓴다"거나 "트랜잭션이 없다"는 뜻은 아니다. Not Only SQL에 가깝고, MongoDB처럼 다중 문서 트랜잭션을 지원하는 제품도 있다.',
      quiz: [
        {
          q: '로그인 세션처럼 키로 빠르게 읽고 쓰는 캐시 용도에 가장 알맞은 유형은?',
          choices: ['키-값 저장소', '그래프 DB', '와이드 컬럼 DB', '관계형 DB의 셀프 조인'],
          answer: 0,
          why: '키 하나로 값을 바로 찾는 단순한 접근에는 키-값 저장소(예: Redis)가 적합하다.'
        },
        {
          q: 'CAP 정리에 대한 설명으로 옳은 것은?',
          choices: ['C, A, P를 모두 항상 보장할 수 있다', '네트워크 분할이 생기면 일관성과 가용성 중 하나를 양보해야 한다', '단일 서버 DB에만 적용된다', '분할 내성(P)은 언제든 포기하면 그만이다'],
          answer: 1,
          why: '분산 환경에서 분할은 피할 수 없으므로, 분할이 생겼을 때 C와 A 중 무엇을 우선할지 고르는 문제가 된다.'
        }
      ]
    },
    {
      id: 'database-16',
      title: '복제와 샤딩',
      minutes: 6,
      oneLiner: '같은 데이터를 여러 서버에 복사하는 복제와, 데이터를 나눠 여러 서버에 분산하는 샤딩으로 규모와 가용성을 늘리는 방법.',
      analogy: '인기 맛집이 레시피를 그대로 쓰는 분점을 내면 복제다. 손님을 나눠 받을 수 있고 본점이 문을 닫아도 영업이 된다. 메뉴가 너무 많아 한식은 1호점, 양식은 2호점으로 나누면 샤딩이다.',
      points: [
        '**복제(Replication)**: 보통 쓰기는 **프라이머리(Primary)**가 받고, 변경을 **레플리카(Replica)**에 전달한다. 읽기 분산과 장애 대비(페일오버)가 목적이다.',
        '**동기 복제**는 레플리카 반영까지 기다려 안전하지만 느리고, **비동기 복제**는 빠르지만 프라이머리 장애 시 최근 커밋이 유실될 수 있다.',
        '비동기 복제에는 **복제 지연(Replication Lag)**이 있어, 방금 쓴 값을 레플리카에서 읽으면 옛 값이 보일 수 있다.',
        '**샤딩(Sharding)**: **샤드 키**로 행을 나눠 각 서버가 일부만 저장한다. 키 범위로 나누는 **범위 샤딩**과 해시값으로 나누는 **해시 샤딩**이 있다.',
        '샤드 키를 잘못 고르면 특정 샤드에 부하가 몰리는 **핫스팟**이 생긴다. 여러 샤드에 걸친 조인과 트랜잭션은 비싸고 복잡하다.'
      ],
      example: {
        caption: '해시 샤딩: 사용자 ID로 샤드 결정',
        lang: 'text',
        code: '샤드 수 = 4\nshard = hash(user_id) % 4\n\nuser_id 1001 -> hash % 4 = 1 -> shard-1\nuser_id 1002 -> hash % 4 = 3 -> shard-3\n\n샤드를 5개로 늘리면 대부분의 키가 이동한다.\n-> 이동량을 줄이려 일관된 해싱을 쓰기도 한다.'
      },
      terms: [
        { term: '복제 지연(Replication Lag)', desc: '프라이머리의 변경이 레플리카에 반영되기까지 걸리는 시간 차.' },
        { term: '샤드 키(Shard Key)', desc: '어느 샤드에 데이터를 둘지 결정하는 기준 속성.' },
        { term: '일관된 해싱(Consistent Hashing)', desc: '노드 수가 바뀌어도 일부 키만 재배치되도록 하는 해싱 기법.' }
      ],
      pitfall: '복제는 쓰기 처리량을 늘려 주지 않는다. 모든 쓰기가 모든 복제본에 반영되어야 하므로, 쓰기 확장이 필요하면 샤딩을 고려한다.',
      quiz: [
        {
          q: '비동기 복제 환경에서 사용자가 글을 쓴 직후 새로고침했더니 글이 보이지 않았다. 가장 가능성 높은 원인은?',
          choices: ['기본 키 중복', '교착 상태', '복제 지연으로 레플리카가 아직 옛 데이터를 가짐', '정규화 부족'],
          answer: 2,
          why: '읽기가 아직 변경을 받지 못한 레플리카로 가면 방금 쓴 값이 보이지 않는다.'
        },
        {
          q: '가입 날짜를 샤드 키로 범위 샤딩했을 때 생기기 쉬운 문제는?',
          choices: ['최신 날짜 샤드에 신규 쓰기가 몰리는 핫스팟', '모든 샤드에 데이터가 완벽히 균등하게 분산됨', '복제가 불가능해짐', '기본 키를 만들 수 없음'],
          answer: 0,
          why: '신규 가입은 항상 가장 최근 범위에 들어가므로 마지막 샤드에만 쓰기가 집중된다.'
        },
        {
          q: '쓰기 처리량 자체를 여러 서버로 늘리는 데 직접적인 방법은?',
          choices: ['읽기 레플리카 추가', '동기 복제로 전환', '격리 수준 상향', '샤딩으로 데이터를 나눠 저장'],
          answer: 3,
          why: '샤딩하면 각 샤드가 서로 다른 데이터의 쓰기를 나눠 받는다. 레플리카는 읽기만 분산한다.'
        }
      ]
    }
  ]
});
