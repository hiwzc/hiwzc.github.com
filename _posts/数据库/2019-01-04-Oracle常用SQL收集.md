---
title: Oracle 常用 SQL 收集
toc: true
permalink: /posts/oracle/sql.html
categories: 数据库
date: 2019-01-04
---

## 授权

```sql
GRANT ALL PRIVILEGES ON XXXDATA.BASE_INFO TO XXXOPR;
REVOKE ALL PRIVILEGES ON XXXDATA.BASE_INFO FROM XXXOPR;
GRANT SELECT, UPDATE, INSERT, DELETE ON XXXDATA.BASE_INFO TO R_XXXDATA_DML;
REVOKE SELECT, UPDATE, INSERT, DELETE ON XXXDATA.BASE_INFO TO R_XXXDATA_DML;
```

## 索引

参考[《create index注意n如果是大表建立索引，切记加上ONLINE参数》](http://wmcxy.iteye.com/blog/891224)。

```sql
CREATE INDEX XXXDATA.IDX_INFO_DEPT_ENDTIME
    ON XXXDATA.XXX_RENEWAL_INFO (DEPARTMENT_CODE, DATE_INSURANCE_END)
    PARALLEL 8
    INITRANS 16
    ONLINE;

ALTER INDEX XXXDATA.IDX_INFO_DEPT_ENDTIME NOPARALLEL ONLINE;
```

## 查询 SQL 执行情况

```sql
SELECT * FROM V$SQL WHERE SQL_ID = 'xxx';
SELECT * FROM V$SQLTEXT WHERE SQL_ID = 'xxx';
```

## 查询绑定变量的值

```sql
  SELECT sn.end_interval_time, sb.name, sb.value_string
    FROM dba_hist_sqlbind sb, dba_hist_snapshot sn
   WHERE sb.sql_id='xxxx'
     AND sb.was_captured='YES'
     AND sn.snap_id=sb.snap_id
ORDER BY sb.snap_id, sb.name, sb.position;
```

## 查询 for update 锁住的表

```sql
SELECT object_name, machine, s.sid, s.serial#
  FROM gv$locked_object l, dba_objects o, gv$session s
 WHERE l.object_id = o.object_id
   AND l.session_id = s.sid;
```

## 查询表及表注释

```sql
SELECT t.owner, t.table_name, a.comments
  FROM all_tables t, all_tab_comments a
 WHERE t.table_name = a.table_name
   AND t.table_name like 'EDR_%'
```

## 字符串连接

```sql
SELECT c1, wm_concat(id)
  FROM t_demo
GROUP BY c1
```

## 使用 Hint 指定索引

```sql
-- 语法
/*+INDEX(TABLE_NAME INDEX_NAME)*/

-- 例如：
SELECT /*+INDEX(T IDX_NAME) */ * FROM T_USER T WHERE T.NAME='hiwzc';
```

## 计算经纬度的距离

使用sdo_distance计算两个坐标点之间的距离。

```sql
select sdo_geom.sdo_distance(
    mdsys.sdo_geometry(2001, 8307, mdsys.sdo_point_type(经度1, 纬度1, 0), null, null),
    mdsys.sdo_geometry(2001, 8307, mdsys.sdo_point_type(经度2, 纬度2, 0), null, null),
    0.5)
from dual;
```

其中2001代表位置为单点，8307代表坐标系为WGS84坐标系，即GPS坐标系，0.5为oracle计算时候的误差精度，单位是米，计算结果单位为米，经纬度说明如下：

中文 | 英文 | 定义 | 取值
--- | --- | --- | ---
经度 | longitude | 地球表面某点随地球自转所形成的轨迹    | 0-90°，赤道0°，北纬为正数，南纬为负数。
纬度 | latitude  | 地球表面连接南北两极的大圆线上的半圆弧 | 0-180°，本初子午线0°，东经正数，西经为负数


## Demo PL/SQL

```sql
declare
    type task_id_list_type is varray(1000) of varchar2(20);

    taskIdList     task_id_list_type;
    v_demo_clob    clob;
    v_taskId       varchar(20);
begin
    taskIdList := task_id_list_type(
        '12345678901234567890',
        '12345678901234567891',
        '12345678901234567892'
    );

    select t.detail
     into v_demo_clob
     from t_demo
    where t.id = 'id';

    for i in 1 .. taskIdList.count loop
        v_taskId := taskIdList(i);
        insert into t_wait
            select * from t_fail a
            where a.task_id = v_taskId;
        delete from t_fail a where a.task_id = v_taskId;
    end loop;
end;
/
```
