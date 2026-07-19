---
title: "构建自定义 AI 客户支持助手——LangGraph 中断机制"
date: 2025-10-09 00:00:00
categories: AI
tags:
- 客户支持
- LangGraph
- 智能助手
- 中断机制
- 状态管理
- 工具调用
- 人机交互
- 旅行助手
- Agent智能体
- Agent开发
description: "本文手把手教你用LangGraph构建自定义AI客户支持助手。以航空公司旅行助手为例，详细介绍LangGraph的中断机制和检查点功能，展示如何组织复杂工具（航班预订、酒店预订、汽车租赁等），管理用户会话状态，实现人机协作的客户支持系统，掌握LangGraph核心概念与架构。"
---

# 构建自定义 AI 客户支持助手

自定义 AI 客户支持助手可以通过处理常规问题来释放团队时间，但构建一个能够可靠处理各种任务而不会让用户抓狂的智能助手可能很困难。

<!-- more -->

在我们这一章节中，我们将为一家航空公司构建自定义 AI 客户支持助手，帮助用户研究和安排旅行。我们将使用 LangGraph 的中断和检查点以及更复杂的状态来组织助手的工具并管理用户的航班预订、酒店预订、汽车租赁和游览。本章节需要我们熟悉前面的 LangGraph 的基本概念和用法。

完成后，我们将构建出一个可工作的智能助手，并了解 LangGraph 的关键概念和架构。我们将能够将这些设计模式应用到其他 AI 项目中。

自定义 AI 助手的架构将如下图所示：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/63e0b3d9d6487f72d1e8a32814308e11fa6a1950.png)

## 准备工作

首先设置环境。我们将安装本教程的先决条件，下载测试数据库，并定义在每个部分中重复使用的工具。

我们将使用 ChatGPT 作为 LLM，并定义多个自定义工具。虽然大多数工具将连接到本地 sqlite 数据库（不需要额外依赖），我们还将使用 Tavily 为代理提供通用网页搜索。

```python
%%capture --no-stderr
%pip install -U langgraph langchain-community langchain-anthropic tavily-python pandas openai
import getpass
import os
def _set_env(var: str):
    if not os.environ.get(var):
        os.environ[var] = getpass.getpass(f"{var}: ")
_set_env("ANTHROPIC_API_KEY")
_set_env("OPENAI_API_KEY")
_set_env("TAVILY_API_KEY")

```

### 填充数据库

运行下一个 python 文件来获取我们为本教程准备的 sqlite 数据库，并更新它使其看起来是最新的。具体文件如下：

```python
import os
import shutil
import sqlite3
import pandas as pd
import requests
db_url = "https://storage.googleapis.com/benchmarks-artifacts/travel-db/travel2.sqlite"
local_file = "travel2.sqlite"
# 备份文件让我们可以在每个教程部分重新开始
backup_file = "travel2.backup.sqlite"
overwrite = False
if overwrite or not os.path.exists(local_file):
    response = requests.get(db_url)
    response.raise_for_status()  # 确保请求成功
    with open(local_file, "wb") as f:
        f.write(response.content)
    # 备份 - 我们将使用这个来"重置"每个部分的数据库
    shutil.copy(local_file, backup_file)
# 将航班转换为当前时间用于教程
def update_dates(file):
    shutil.copy(backup_file, file)
    conn = sqlite3.connect(file)
    cursor = conn.cursor()
    tables = pd.read_sql(
        "SELECT name FROM sqlite_master WHERE type='table';", conn
    ).name.tolist()
    tdf = {}
    for t in tables:
        tdf[t] = pd.read_sql(f"SELECT * from {t}", conn)
    example_time = pd.to_datetime(
        tdf["flights"]["actual_departure"].replace("\\N", pd.NaT)
    ).max()
    current_time = pd.to_datetime("now").tz_localize(example_time.tz)
    time_diff = current_time - example_time
    tdf["bookings"]["book_date"] = (
        pd.to_datetime(tdf["bookings"]["book_date"].replace("\\N", pd.NaT), utc=True)
        + time_diff
    )
    datetime_columns = [
        "scheduled_departure",
        "scheduled_arrival",
        "actual_departure",
        "actual_arrival",
    ]
    for column in datetime_columns:
        tdf["flights"][column] = (
            pd.to_datetime(tdf["flights"][column].replace("\\N", pd.NaT)) + time_diff
        )
    for table_name, df in tdf.items():
        df.to_sql(table_name, conn, if_exists="replace", index=False)
    del df
    del tdf
    conn.commit()
    conn.close()
    return file
db = update_dates(local_file)

```

## 工具定义

接下来，定义助手的工具来搜索航空公司的政策手册，以及搜索和管理航班、酒店、汽车租赁和游览的预订。我们将在整个教程中重复使用这些工具。确切的实现并不重要，因此请随意运行下面的代码并跳转到第一部分。

### 查找公司政策

助手检索政策信息来回答用户问题。请注意，这些政策的执行仍然必须在工具 / API 本身中完成，因为 LLM 总是可以忽略这些。

```python
import re
import numpy as np
import openai
from langchain_core.tools import tool
response = requests.get(
    "https://storage.googleapis.com/benchmarks-artifacts/travel-db/swiss_faq.md"
)
response.raise_for_status()
faq_text = response.text
docs = [{"page_content": txt} for txt in re.split(r"(?=\n##)", faq_text)]
class VectorStoreRetriever:
    def __init__(self, docs: list, vectors: list, oai_client):
        self._arr = np.array(vectors)
        self._docs = docs
        self._client = oai_client
    @classmethod
    def from_docs(cls, docs, oai_client):
        embeddings = oai_client.embeddings.create(
            model="text-embedding-3-small", 
            input=[doc["page_content"] for doc in docs]
        )
        vectors = [emb.embedding for emb in embeddings.data]
        return cls(docs, vectors, oai_client)
    def query(self, query: str, k: int = 5) -> list[dict]:
        embed = self._client.embeddings.create(
            model="text-embedding-3-small", input=[query]
        )
        # "@" 在Python中只是矩阵乘法
        scores = np.array(embed.data[0].embedding) @ self._arr.T
        top_k_idx = np.argpartition(scores, -k)[-k:]
        top_k_idx_sorted = top_k_idx[np.argsort(-scores[top_k_idx])]
        return [
            {**self._docs[idx], "similarity": scores[idx]} 
            for idx in top_k_idx_sorted
        ]
retriever = VectorStoreRetriever.from_docs(docs, openai.Client())
@tool
def lookup_policy(query: str) -> str:
    """查询公司政策以检查是否允许某些选项。
    在进行任何航班更改或执行其他'写入'事件之前使用此工具。"""
    docs = retriever.query(query, k=2)
    return "\n\n".join([doc["page_content"] for doc in docs])

```

### 航班工具

定义 `fetch_user_flight_information` 工具让代理查看当前用户的航班信息。然后定义工具来搜索航班并管理存储在 SQL 数据库中的乘客预订。

我们然后可以访问给定运行的 RunnableConfig 来检查访问此应用程序的用户的 passenger_id。LLM 从不必须明确提供这些，它们是为图的给定调用提供的，这样每个用户就不能访问其他乘客的预订信息。需要注意的是教程期望 `langchain-core>=0.2.16` 以使用注入的 RunnableConfig。在此之前，我们可以使用 `ensure_config` 从上下文中收集配置。

```python
import sqlite3
from datetime import date, datetime
from typing import Optional
import pytz
from langchain_core.runnables import RunnableConfig
@tool
def fetch_user_flight_information(config: RunnableConfig) -> list[dict]:
    """获取用户的所有机票以及相应的航班信息和座位分配。
    返回：
        包含票务详情、相关航班详情和属于用户的每张票的座位分配的字典列表。
    """
    configuration = config.get("configurable", {})
    passenger_id = configuration.get("passenger_id", None)
    if not passenger_id:
        raise ValueError("未配置乘客ID。")
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    query = """
    SELECT 
        t.ticket_no, t.book_ref,
        f.flight_id, f.flight_no, f.departure_airport, f.arrival_airport, 
        f.scheduled_departure, f.scheduled_arrival,
        bp.seat_no, tf.fare_conditions
    FROM 
        tickets t
        JOIN ticket_flights tf ON t.ticket_no = tf.ticket_no
        JOIN flights f ON tf.flight_id = f.flight_id
        JOIN boarding_passes bp ON bp.ticket_no = t.ticket_no AND bp.flight_id = f.flight_id
    WHERE 
        t.passenger_id = ?
    """
    cursor.execute(query, (passenger_id,))
    rows = cursor.fetchall()
    column_names = [column[0] for column in cursor.description]
    results = [dict(zip(column_names, row)) for row in rows]
    cursor.close()
    conn.close()
    return results
@tool
def search_flights(
    departure_airport: Optional[str] = None,
    arrival_airport: Optional[str] = None,
    start_time: Optional[date | datetime] = None,
    end_time: Optional[date | datetime] = None,
    limit: int = 20,
) -> list[dict]:
    """根据出发机场、到达机场和出发时间范围搜索航班。"""
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    query = "SELECT * FROM flights WHERE 1 = 1"
    params = []
    if departure_airport:
        query += " AND departure_airport = ?"
        params.append(departure_airport)
    if arrival_airport:
        query += " AND arrival_airport = ?"
        params.append(arrival_airport)
    if start_time:
        query += " AND scheduled_departure >= ?"
        params.append(start_time)
    if end_time:
        query += " AND scheduled_departure <= ?"
        params.append(end_time)
    query += " LIMIT ?"
    params.append(limit)
    cursor.execute(query, params)
    rows = cursor.fetchall()
    column_names = [column[0] for column in cursor.description]
    results = [dict(zip(column_names, row)) for row in rows]
    cursor.close()
    conn.close()
    return results
@tool
def update_ticket_to_new_flight(
    ticket_no: str, new_flight_id: int, *, config: RunnableConfig
) -> str:
    """将用户的机票更新为新的有效航班。"""
    configuration = config.get("configurable", {})
    passenger_id = configuration.get("passenger_id", None)
    if not passenger_id:
        raise ValueError("未配置乘客ID。")
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT departure_airport, arrival_airport, scheduled_departure FROM flights WHERE flight_id = ?",
        (new_flight_id,),
    )
    new_flight = cursor.fetchone()
    if not new_flight:
        cursor.close()
        conn.close()
        return "提供的新航班ID无效。"
    column_names = [column[0] for column in cursor.description]
    new_flight_dict = dict(zip(column_names, new_flight))
    timezone = pytz.timezone("Etc/GMT-3")
    current_time = datetime.now(tz=timezone)
    departure_time = datetime.strptime(
        new_flight_dict["scheduled_departure"], "%Y-%m-%d %H:%M:%S.%f%z"
    )
    time_until = (departure_time - current_time).total_seconds()
    if time_until < (3 * 3600):
        return f"不允许改签到距离当前时间不足3小时的航班。所选航班时间为 {departure_time}。"
    cursor.execute(
        "SELECT flight_id FROM ticket_flights WHERE ticket_no = ?", (ticket_no,)
    )
    current_flight = cursor.fetchone()
    if not current_flight:
        cursor.close()
        conn.close()
        return "未找到给定票号的现有机票。"
    # 检查登录用户是否确实拥有此机票
    cursor.execute(
        "SELECT * FROM tickets WHERE ticket_no = ? AND passenger_id = ?",
        (ticket_no, passenger_id),
    )
    current_ticket = cursor.fetchone()
    if not current_ticket:
        cursor.close()
        conn.close()
        return f"当前登录乘客ID {passenger_id} 不是机票 {ticket_no} 的所有者"
    # 在实际应用中，您可能会在这里添加额外的检查来执行业务逻辑，
    # 比如"新的出发机场是否与当前机票匹配"等等。
    # 虽然最好尝试向LLM主动"类型提示"政策
    # 但它不可避免地会出错，所以您**也**需要确保您的
    # API强制执行有效行为
    cursor.execute(
        "UPDATE ticket_flights SET flight_id = ? WHERE ticket_no = ?",
        (new_flight_id, ticket_no),
    )
    conn.commit()
    cursor.close()
    conn.close()
    return "机票已成功更新为新航班。"
@tool
def cancel_ticket(ticket_no: str, *, config: RunnableConfig) -> str:
    """取消用户的机票并从数据库中删除。"""
    configuration = config.get("configurable", {})
    passenger_id = configuration.get("passenger_id", None)
    if not passenger_id:
        raise ValueError("未配置乘客ID。")
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT flight_id FROM ticket_flights WHERE ticket_no = ?", (ticket_no,)
    )
    existing_ticket = cursor.fetchone()
    if not existing_ticket:
        cursor.close()
        conn.close()
        return "未找到给定票号的现有机票。"
    # 检查登录用户是否确实拥有此机票
    cursor.execute(
        "SELECT ticket_no FROM tickets WHERE ticket_no = ? AND passenger_id = ?",
        (ticket_no, passenger_id),
    )
    current_ticket = cursor.fetchone()
    if not current_ticket:
        cursor.close()
        conn.close()
        return f"当前登录乘客ID {passenger_id} 不是机票 {ticket_no} 的所有者"
    cursor.execute("DELETE FROM ticket_flights WHERE ticket_no = ?", (ticket_no,))
    conn.commit()
    cursor.close()
    conn.close()
    return "机票已成功取消。"

```

### 汽车租赁工具

用户预订航班后，可能需要安排交通。定义一些 "汽车租赁" 工具，让用户搜索并在目的地预订汽车。

```python
from datetime import date, datetime
from typing import Optional, Union
@tool
def search_car_rentals(
    location: Optional[str] = None,
    name: Optional[str] = None,
    price_tier: Optional[str] = None,
    start_date: Optional[Union[datetime, date]] = None,
    end_date: Optional[Union[datetime, date]] = None,
) -> list[dict]:
    """
    根据位置、名称、价格等级、开始日期和结束日期搜索汽车租赁。
    参数：
        location (Optional[str]): 汽车租赁的位置。默认为None。
        name (Optional[str]): 汽车租赁公司的名称。默认为None。
        price_tier (Optional[str]): 汽车租赁的价格等级。默认为None。
        start_date (Optional[Union[datetime, date]]): 汽车租赁的开始日期。默认为None。
        end_date (Optional[Union[datetime, date]]): 汽车租赁的结束日期。默认为None。
    返回：
        list[dict]: 符合搜索条件的汽车租赁字典列表。
    """
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    query = "SELECT * FROM car_rentals WHERE 1=1"
    params = []
    if location:
        query += " AND location LIKE ?"
        params.append(f"%{location}%")
    if name:
        query += " AND name LIKE ?"
        params.append(f"%{name}%")
    # 对于我们的教程，我们将允许您匹配任何日期和价格等级。
    # （因为我们的玩具数据集没有太多数据）
    cursor.execute(query, params)
    results = cursor.fetchall()
    conn.close()
    return [
        dict(zip([column[0] for column in cursor.description], row)) for row in results
    ]
@tool
def book_car_rental(rental_id: int) -> str:
    """
    通过ID预订汽车租赁。
    参数：
        rental_id (int): 要预订的汽车租赁的ID。
    返回：
        str: 指示汽车租赁是否成功预订的消息。
    """
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    cursor.execute("UPDATE car_rentals SET booked = 1 WHERE id = ?", (rental_id,))
    conn.commit()
    if cursor.rowcount > 0:
        conn.close()
        return f"汽车租赁 {rental_id} 已成功预订。"
    else:
        conn.close()
        return f"未找到ID为 {rental_id} 的汽车租赁。"
@tool
def update_car_rental(
    rental_id: int,
    start_date: Optional[Union[datetime, date]] = None,
    end_date: Optional[Union[datetime, date]] = None,
) -> str:
    """
    通过ID更新汽车租赁的开始和结束日期。
    参数：
        rental_id (int): 要更新的汽车租赁的ID。
        start_date (Optional[Union[datetime, date]]): 汽车租赁的新开始日期。默认为None。
        end_date (Optional[Union[datetime, date]]): 汽车租赁的新结束日期。默认为None。
    返回：
        str: 指示汽车租赁是否成功更新的消息。
    """
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    if start_date:
        cursor.execute(
            "UPDATE car_rentals SET start_date = ? WHERE id = ?",
            (start_date, rental_id),
        )
    if end_date:
        cursor.execute(
            "UPDATE car_rentals SET end_date = ? WHERE id = ?", (end_date, rental_id)
        )
    conn.commit()
    if cursor.rowcount > 0:
        conn.close()
        return f"汽车租赁 {rental_id} 已成功更新。"
    else:
        conn.close()
        return f"未找到ID为 {rental_id} 的汽车租赁。"
@tool
def cancel_car_rental(rental_id: int) -> str:
    """
    通过ID取消汽车租赁。
    参数：
        rental_id (int): 要取消的汽车租赁的ID。
    返回：
        str: 指示汽车租赁是否成功取消的消息。
    """
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    cursor.execute("UPDATE car_rentals SET booked = 0 WHERE id = ?", (rental_id,))
    conn.commit()
    if cursor.rowcount > 0:
        conn.close()
        return f"汽车租赁 {rental_id} 已成功取消。"
    else:
        conn.close()
        return f"未找到ID为 {rental_id} 的汽车租赁。"

```

### 酒店工具

用户需要住宿！定义一些工具来搜索和管理酒店预订。

```python
@tool
def search_hotels(
    location: Optional[str] = None,
    name: Optional[str] = None,
    price_tier: Optional[str] = None,
    checkin_date: Optional[Union[datetime, date]] = None,
    checkout_date: Optional[Union[datetime, date]] = None,
) -> list[dict]:
    """
    根据位置、名称、价格等级、入住日期和退房日期搜索酒店。
    参数：
        location (Optional[str]): 酒店的位置。默认为None。
        name (Optional[str]): 酒店的名称。默认为None。
        price_tier (Optional[str]): 酒店的价格等级。默认为None。示例：中档、高档中档、高端、豪华
        checkin_date (Optional[Union[datetime, date]]): 酒店的入住日期。默认为None。
        checkout_date (Optional[Union[datetime, date]]): 酒店的退房日期。默认为None。
    返回：
        list[dict]: 符合搜索条件的酒店字典列表。
    """
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    query = "SELECT * FROM hotels WHERE 1=1"
    params = []
    if location:
        query += " AND location LIKE ?"
        params.append(f"%{location}%")
    if name:
        query += " AND name LIKE ?"
        params.append(f"%{name}%")
    # 为了本教程的目的，我们将允许您匹配任何日期和价格等级。
    cursor.execute(query, params)
    results = cursor.fetchall()
    conn.close()
    return [
        dict(zip([column[0] for column in cursor.description], row)) for row in results
    ]
@tool
def book_hotel(hotel_id: int) -> str:
    """
    通过ID预订酒店。
    参数：
        hotel_id (int): 要预订的酒店的ID。
    返回：
        str: 指示酒店是否成功预订的消息。
    """
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    cursor.execute("UPDATE hotels SET booked = 1 WHERE id = ?", (hotel_id,))
    conn.commit()
    if cursor.rowcount > 0:
        conn.close()
        return f"酒店 {hotel_id} 已成功预订。"
    else:
        conn.close()
        return f"未找到ID为 {hotel_id} 的酒店。"
@tool
def update_hotel(
    hotel_id: int,
    checkin_date: Optional[Union[datetime, date]] = None,
    checkout_date: Optional[Union[datetime, date]] = None,
) -> str:
    """
    通过ID更新酒店的入住和退房日期。
    参数：
        hotel_id (int): 要更新的酒店的ID。
        checkin_date (Optional[Union[datetime, date]]): 酒店的新入住日期。默认为None。
        checkout_date (Optional[Union[datetime, date]]): 酒店的新退房日期。默认为None。
    返回：
        str: 指示酒店是否成功更新的消息。
    """
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    if checkin_date:
        cursor.execute(
            "UPDATE hotels SET checkin_date = ? WHERE id = ?", (checkin_date, hotel_id)
        )
    if checkout_date:
        cursor.execute(
            "UPDATE hotels SET checkout_date = ? WHERE id = ?",
            (checkout_date, hotel_id),
        )
    conn.commit()
    if cursor.rowcount > 0:
        conn.close()
        return f"酒店 {hotel_id} 已成功更新。"
    else:
        conn.close()
        return f"未找到ID为 {hotel_id} 的酒店。"
@tool
def cancel_hotel(hotel_id: int) -> str:
    """
    通过ID取消酒店。
    参数：
        hotel_id (int): 要取消的酒店的ID。
    返回：
        str: 指示酒店是否成功取消的消息。
    """
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    cursor.execute("UPDATE hotels SET booked = 0 WHERE id = ?", (hotel_id,))
    conn.commit()
    if cursor.rowcount > 0:
        conn.close()
        return f"酒店 {hotel_id} 已成功取消。"
    else:
        conn.close()
        return f"未找到ID为 {hotel_id} 的酒店。"

```

### 游览工具

最后，定义一些工具让用户搜索到达后的活动（并进行预订）。

```python
@tool
def search_trip_recommendations(
    location: Optional[str] = None,
    name: Optional[str] = None,
    keywords: Optional[str] = None,
) -> list[dict]:
    """
    根据位置、名称和关键词搜索旅行推荐。
    参数：
        location (Optional[str]): 旅行推荐的位置。默认为None。
        name (Optional[str]): 旅行推荐的名称。默认为None。
        keywords (Optional[str]): 与旅行推荐相关的关键词。默认为None。
    返回：
        list[dict]: 符合搜索条件的旅行推荐字典列表。
    """
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    query = "SELECT * FROM trip_recommendations WHERE 1=1"
    params = []
    if location:
        query += " AND location LIKE ?"
        params.append(f"%{location}%")
    if name:
        query += " AND name LIKE ?"
        params.append(f"%{name}%")
    if keywords:
        keyword_list = keywords.split(",")
        keyword_conditions = " OR ".join(["keywords LIKE ?" for _ in keyword_list])
        query += f" AND ({keyword_conditions})"
        params.extend([f"%{keyword.strip()}%" for keyword in keyword_list])
    cursor.execute(query, params)
    results = cursor.fetchall()
    conn.close()
    return [
        dict(zip([column[0] for column in cursor.description], row)) for row in results
    ]
@tool
def book_excursion(recommendation_id: int) -> str:
    """
    通过推荐ID预订游览。
    参数：
        recommendation_id (int): 要预订的旅行推荐的ID。
    返回：
        str: 指示旅行推荐是否成功预订的消息。
    """
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE trip_recommendations SET booked = 1 WHERE id = ?", (recommendation_id,)
    )
    conn.commit()
    if cursor.rowcount > 0:
        conn.close()
        return f"旅行推荐 {recommendation_id} 已成功预订。"
    else:
        conn.close()
        return f"未找到ID为 {recommendation_id} 的旅行推荐。"
@tool
def update_excursion(recommendation_id: int, details: str) -> str:
    """
    通过ID更新旅行推荐的详情。
    参数：
        recommendation_id (int): 要更新的旅行推荐的ID。
        details (str): 旅行推荐的新详情。
    返回：
        str: 指示旅行推荐是否成功更新的消息。
    """
    conn = sqlite3.connect(db)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE trip_recommendations SET details = ? WHERE id = ?",
        (details, recommendation_id),
    )
    conn.commit()
    if cursor.rowcount > 0:
        conn.close()
        return f"旅行推荐 {recommendation_id} 已成功更新。"
    else:
        conn.close()
        return f"未找到ID为 {recommendation_id} 的旅行推荐。"

```

### 实用工具

定义辅助函数来在调试时美化打印图中的消息，并为工具节点提供错误处理。

```python
from langchain_core.messages import ToolMessage
from langchain_core.runnables import RunnableLambda
from langgraph.prebuilt import ToolNode
def handle_tool_error(state) -> dict:
    error = state.get("error")
    tool_calls = state["messages"][-1].tool_calls
    return {
        "messages": [
            ToolMessage(
                content=f"Error: {repr(error)}\n please fix your mistakes.",
                tool_call_id=tc["id"],
            )
            for tc in tool_calls
        ]
    }
def create_tool_node_with_fallback(tools: list) -> dict:
    return ToolNode(tools).with_fallbacks(
        [RunnableLambda(handle_tool_error)], exception_key="error"
    )
def _print_event(event: dict, _printed: set, max_length=1500):
    current_state = event.get("dialog_state")
    if current_state:
        print("Currently in: ", current_state[-1])
    message = event.get("messages")
    if message:
        if isinstance(message, list):
            message = message[-1]
        if message.id not in _printed:
            msg_repr = message.pretty_repr(html=True)
            if len(msg_repr) > max_length:
                msg_repr = msg_repr[:max_length] + " ... (truncated)"
            print(msg_repr)
            _printed.add(message.id)

```

## 第一部分：零样本代理

在本节中，我们将定义一个简单的零样本代理作为助手，为代理提供所有工具，并提示它明智地使用这些工具来协助用户。

简单的 2 节点图如下所示：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/c7b57e89580263fc00d6a95d6e40720e00c298f6.png)

### 状态

将 StateGraph 的状态定义为包含仅追加消息列表的类型化字典。这些消息形成聊天历史记录，这是我们简单助手所需的全部状态。

```python
from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph.message import AnyMessage, add_messages
class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]

```

### 代理

接下来，定义助手函数。该函数接受图状态，将其格式化为提示，然后调用 LLM 来预测最佳响应。

```python
from langchain_openai import ChatOpenAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable, RunnableConfig
class Assistant:
    def __init__(self, runnable: Runnable):
        self.runnable = runnable
    def __call__(self, state: State, config: RunnableConfig):
        while True:
            configuration = config.get("configurable", {})
            passenger_id = configuration.get("passenger_id", None)
            state = {**state, "user_info": passenger_id}
            result = self.runnable.invoke(state)
            # 如果LLM返回空响应，我们将重新提示它给出实际响应
            if not result.tool_calls and (
                not result.content
                or isinstance(result.content, list)
                and not result.content[0].get("text")
            ):
                messages = state["messages"] + [("user", "请给出真实的输出。")]
                state = {**state, "messages": messages}
            else:
                break
        return {"messages": result}
# Haiku更快更便宜，但不太准确
# llm = ChatAnthropic(model="claude-3-haiku-20240307")
llm = ChatOpenAI(model="gpt-4o", temperature=1)
primary_assistant_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "您是瑞士航空公司的有用客户支持助手。"
            " 使用提供的工具搜索航班、公司政策和其他信息来协助用户查询。"
            " 搜索时要持之以恒。如果第一次搜索没有返回结果，请扩大查询范围。"
            " 如果搜索结果为空，请在放弃之前扩大搜索范围。"
            "\n\n当前用户:\n<User>\n{user_info}\n</User>"
            "\n当前时间: {time}。",
        ),
        ("placeholder", "{messages}"),
    ]
).partial(time=datetime.now)
part_1_tools = [
    TavilySearchResults(max_results=1),
    fetch_user_flight_information,
    search_flights,
    lookup_policy,
    update_ticket_to_new_flight,
    cancel_ticket,
    search_car_rentals,
    book_car_rental,
    update_car_rental,
    cancel_car_rental,
    search_hotels,
    book_hotel,
    update_hotel,
    cancel_hotel,
    search_trip_recommendations,
    book_excursion,
    update_excursion,
    cancel_excursion,
]
part_1_assistant_runnable = primary_assistant_prompt | llm.bind_tools(part_1_tools)

```

### 定义图

现在创建图。图是本节的最终助手。

```python
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, StateGraph, START
from langgraph.prebuilt import tools_condition
builder = StateGraph(State)
# 定义节点：执行工作
builder.add_node("assistant", Assistant(part_1_assistant_runnable))
builder.add_node("tools", create_tool_node_with_fallback(part_1_tools))
# 定义边：确定控制流如何移动
builder.add_edge(START, "assistant")
builder.add_conditional_edges(
    "assistant",
    tools_condition,
)
builder.add_edge("tools", "assistant")
# 检查点器让图持久化其状态
# 这是整个图的完整内存
memory = InMemorySaver()
part_1_graph = builder.compile(checkpointer=memory)

```

### 示例对话

现在是时候试试我们强大的聊天机器人了！让我们在以下对话轮次列表上运行它。如果遇到 "RecursionLimit"，这意味着代理无法在分配的步骤数内得到答案。没关系！在本教程的后续部分中，我们还有更多方法。

```python
import shutil
import uuid
# 创建用户可能与助手进行的示例对话
tutorial_questions = [
    "您好，我的航班是什么时间？",
    "我可以将航班更新为更早的时间吗？我想今天晚些时候离开。",
    "那么将我的航班更新为下周某个时间",
    "下一个可用选项很好",
    "住宿和交通怎么样？",
    "是的，我想要一个经济实惠的酒店，住一周（7天）。我还想租一辆车。",
    "好的，您能为您推荐的酒店预订吗？听起来不错。",
    "是的，请继续预订任何费用适中且有空房的酒店。",
    "现在关于汽车，我有什么选择？",
    "太棒了，让我们选择最便宜的选项。请预订7天",
    "很好，现在您对游览有什么建议？",
    "我在那里的时候有这些活动吗？",
    "有趣 - 我喜欢博物馆，有什么选择？",
    "好的，很好，选择一个并为我在那里的第二天预订。",
]
# 使用备份文件更新，这样我们可以在每个部分从原始位置重新开始
db = update_dates(db)
thread_id = str(uuid.uuid4())
config = {
    "configurable": {
        # passenger_id用于我们的航班工具来获取用户的航班信息
        "passenger_id": "3442 587242",
        # 检查点通过thread_id访问
        "thread_id": thread_id,
    }
}
_printed = set()
for question in tutorial_questions:
    events = part_1_graph.stream(
        {"messages": ("user", question)}, config, stream_mode="values"
    )
    for event in events:
        _print_event(event, _printed)

```

## 第一部分回顾

我们的简单助手还不错！它能够合理地回应所有问题，快速地在上下文中响应，并成功执行所有任务。

如果这是一个简单的问答机器人，我们可能会对上述结果感到满意。由于我们的客户支持机器人代表用户采取行动，上述的一些行为有点令人担忧：

1.  **未经确认的预订，助手在我们专注于住宿时预订了汽车，然后不得不稍后取消和重新预订：糟糕！用户应该在预订前有最终决定权，以避免不需要的费用。**
2.  **搜索困难，助手在搜索推荐时遇到困难。我们可以通过为工具添加更详细的说明和示例来改进这一点，但为每个工具这样做可能导致大型提示和不知所措的代理。**
3.  **效率问题，助手必须进行明确搜索才能获得用户的相关信息。我们可以通过立即获取用户的相关旅行详情来节省大量时间，这样助手就可以直接回应。**

在下一节中，我们将解决前两个问题。

## 总结

本教程的第一部分展示了如何构建一个基本的客户支持机器人，后续部分将通过更高级的 LangGraph 功能（如中断和检查点）来解决这些问题，创建更可靠和用户友好的客户支持体验。这个教程为构建复杂的 AI 客户支持系统提供了坚实的基础，展示了如何将多个工具和服务集成到一个连贯的对话界面中。

# LangGraph 中断机制

本章我们将展示如何在 LangGraph 中实现用户确认机制，让用户能够控制 AI 助手的敏感操作。

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/c126de2b12f3056d0a8b5d4a9fd039650af70d11.png)

## 第二部分：添加操作确认机制

在讲之前，问大家一个问题呢，为什么需要确认机制？当助手代表用户执行操作时，用户应该（几乎）始终对是否执行这些操作拥有最终决定权。否则，助手的任何小错误（或它可能遭受的提示注入攻击）都可能给用户造成实际损害。

所以在本节中，我们将使用 `interrupt_before` 来暂停图的执行，并在执行任何工具之前将控制权返回给用户。我们构造的结构如下所示：

```
用户输入 → 获取用户信息 → 助手 → [中断点] → 工具执行 → 助手

```

### 步骤 1：定义状态和助手

我们的图状态和 LLM 调用与上一章几乎相同，但有一个例外：我们添加了一个 `user_info` 字段，它将在图开始时就被填充，我们可以直接在助手对象中使用状态，而不是使用可配置参数。

```python
from typing import Annotated
from langchain_anthropic import ChatAnthropic
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable, RunnableConfig
from typing_extensions import TypedDict
from langgraph.graph.message import AnyMessage, add_messages
# 定义状态
class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
    user_info: str  # 新增：用户信息字段
# 定义助手类
class Assistant:
    def __init__(self, runnable: Runnable):
        self.runnable = runnable
    def __call__(self, state: State, config: RunnableConfig):
        while True:
            result = self.runnable.invoke(state)
            # 如果 LLM 恰好返回空响应，我们会重新提示它给出实际响应
            if not result.tool_calls and (
                not result.content
                or isinstance(result.content, list)
                and not result.content[0].get("text")
            ):
                messages = state["messages"] + [("user", "Respond with a real output.")]
                state = {**state, "messages": messages}
            else:
                break
        return {"messages": result}
# 配置 LLM
llm = ChatAnthropic(model="claude-3-sonnet-20240229", temperature=1)
# 定义助手提示词
assistant_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a helpful customer support assistant for Swiss Airlines. "
            "Use the provided tools to search for flights, company policies, and other information to assist the user's queries. "
            "When searching, be persistent. Expand your query bounds if the first search returns no results. "
            "If a search comes up empty, expand your search before giving up."
            "\n\nCurrent user:\n<User>\n{user_info}\n</User>"
            "\nCurrent time: {time}.",
        ),
        ("placeholder", "{messages}"),
    ]
).partial(time=datetime.now)
# 定义工具列表
part_2_tools = [
    TavilySearchResults(max_results=1),
    fetch_user_flight_information,
    search_flights,
    lookup_policy,
    update_ticket_to_new_flight,
    cancel_ticket,
    search_car_rentals,
    book_car_rental,
    update_car_rental,
    cancel_car_rental,
    search_hotels,
    book_hotel,
    update_hotel,
    cancel_hotel,
    search_trip_recommendations,
    book_excursion,
    update_excursion,
    cancel_excursion,
]
# 绑定工具到 LLM
part_2_assistant_runnable = assistant_prompt | llm.bind_tools(part_2_tools)

```

### 步骤 2：定义图结构

现在创建图。与上一章相比，我们做了 2 个重要改变来解决之前的问题：在使用工具之前添加中断点，在第一个节点中显式填充用户状态，这样助手无需使用工具就能了解用户信息。

```python
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import StateGraph
from langgraph.prebuilt import tools_condition
builder = StateGraph(State)
# 定义用户信息节点
def user_info(state: State):
    return {"user_info": fetch_user_flight_information.invoke({})}
# 新增：fetch_user_info 节点首先运行
# 这意味着我们的助手无需执行操作就能看到用户的航班信息
builder.add_node("fetch_user_info", user_info)
builder.add_edge(START, "fetch_user_info")
# 添加助手节点
builder.add_node("assistant", Assistant(part_2_assistant_runnable))
# 添加工具节点
builder.add_node("tools", create_tool_node_with_fallback(part_2_tools))
# 定义边
builder.add_edge("fetch_user_info", "assistant")
builder.add_conditional_edges("assistant", tools_condition)
builder.add_edge("tools", "assistant")
# 配置检查点和中断
memory = InMemorySaver()
part_2_graph = builder.compile(
    checkpointer=memory,
    # 新增：图将始终在执行 "tools" 节点之前暂停
    # 用户可以在助手继续之前批准或拒绝（甚至更改请求）
    interrupt_before=["tools"],
)

```

### 步骤 3：运行对话示例

现在我们运行一下新改进的聊天机器人！让我们在以下对话轮次列表上运行它。

```python
import shutil
import uuid
# 更新备份文件，以便我们可以在每个部分从原始位置重新启动
db = update_dates(db)
thread_id = str(uuid.uuid4())
config = {
    "configurable": {
        # passenger_id 用于我们的航班工具来获取用户的航班信息
        "passenger_id": "3442 587242",
        # 检查点通过 thread_id 访问
        "thread_id": thread_id,
    }
}
_printed = set()
# 我们可以重用第 1 部分的教程问题来看看它的表现
for question in tutorial_questions:
    # 流式处理事件
    events = part_2_graph.stream(
        {"messages": ("user", question)}, 
        config, 
        stream_mode="values"
    )
    for event in events:
        _print_event(event, _printed)
    # 获取当前状态快照
    snapshot = part_2_graph.get_state(config)
    # 处理中断
    while snapshot.next:
        # 我们有一个中断！代理正在尝试使用工具，用户可以批准或拒绝
        # 注意：此代码完全在图之外。通常，你会将输出流式传输到 UI
        # 然后，当用户提供输入时，前端会通过 API 调用触发新的运行
        try:
            user_input = input(
                "Do you approve of the above actions? Type 'y' to continue;"
                " otherwise, explain your requested changed.\n\n"
            )
        except:
            user_input = "y"
        if user_input.strip() == "y":
            # 直接继续
            result = part_2_graph.invoke(None, config)
        else:
            # 通过提供有关请求更改/改变主意的说明来满足工具调用
            result = part_2_graph.invoke(
                {
                    "messages": [
                        ToolMessage(
                            tool_call_id=event["messages"][-1].tool_calls[0]["id"],
                            content=f"API call denied by user. Reasoning: '{user_input}'. Continue assisting, accounting for the user's input.",
                        )
                    ]
                },
                config,
            )
        # 更新快照
        snapshot = part_2_graph.get_state(config)

```

现在我们的助手能够节省一个步骤来响应我们的航班详细信息。我们还完全控制了执行哪些操作。这一切都是使用 LangGraph 的**中断机制**和**检查点**实现的。中断机制就是暂停图的执行，其状态使用你配置的检查点安全地持久化，用户随后可以通过使用正确的配置运行图来随时启动它，而状态从检查点加载，就好像它从未被中断过一样。

这里还有个问题，我们实际上不需要参与**每一个**助手操作，下面我们将重新组织图，以便我们只在实际写入数据库的 "敏感" 操作上中断。

## 第三部分：条件中断

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/64b14299cdb8527bcb2b6fb6cb10e17250f2e1db.png)

现在我们将通过将工具分类为**安全工具**（只读）和**敏感工具**（修改数据）来优化我们的中断策略。我们将仅对敏感工具应用中断，允许机器人自主处理简单查询。这在用户控制和对话流畅性之间取得了平衡。但随着我们添加更多工具，我们的单一图可能会因这种 "扁平" 结构而变得过于复杂。

### 大致的图结构如下

```
用户输入 → 获取用户信息 → 助手 → 路由决策
                                    ↓
                        ┌───────────┴───────────┐
                        ↓                       ↓
                   安全工具                敏感工具
                   (直接执行)            [需要确认]
                        ↓                       ↓
                        └───────────┬───────────┘
                                    ↓
                                  助手

```

### 步骤 1：定义状态（与第 2 部分相同）

我们的状态和 LLM 调用与第 2 部分完全相同，这里就不演示代码了。

### 步骤 2：将工具分类

这里涉及到关键变更：将工具分为两类。

```python
# "只读"工具（如检索器）不需要用户确认即可使用
part_3_safe_tools = [
    TavilySearchResults(max_results=1),
    fetch_user_flight_information,
    search_flights,
    lookup_policy,
    search_car_rentals,
    search_hotels,
    search_trip_recommendations,
]
# 这些工具都会更改用户的预订
# 用户有权控制做出什么决定
part_3_sensitive_tools = [
    update_ticket_to_new_flight,
    cancel_ticket,
    book_car_rental,
    update_car_rental,
    cancel_car_rental,
    book_hotel,
    update_hotel,
    cancel_hotel,
    book_excursion,
    update_excursion,
    cancel_excursion,
]
# 创建敏感工具名称集合（用于路由判断）
sensitive_tool_names = {t.name for t in part_3_sensitive_tools}
# 我们的 LLM 不必知道它必须路由到哪些节点
# 在它的"思维"中，它只是在调用函数
part_3_assistant_runnable = assistant_prompt | llm.bind_tools(
    part_3_safe_tools + part_3_sensitive_tools
)

```

### 步骤 3：定义图结构

现在创建图。我们的图与第 2 部分几乎相同，只是我们将工具拆分为 2 个单独的节点。我们只在实际更改用户预订的工具之前中断。

```python
from typing import Literal
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import StateGraph
from langgraph.prebuilt import tools_condition
builder = StateGraph(State)
# 定义用户信息节点
def user_info(state: State):
    return {"user_info": fetch_user_flight_information.invoke({})}
# 新增：fetch_user_info 节点首先运行
builder.add_node("fetch_user_info", user_info)
builder.add_edge(START, "fetch_user_info")
# 添加助手节点
builder.add_node("assistant", Assistant(part_3_assistant_runnable))
# 添加两个工具节点
builder.add_node("safe_tools", create_tool_node_with_fallback(part_3_safe_tools))
builder.add_node("sensitive_tools", create_tool_node_with_fallback(part_3_sensitive_tools))
# 定义逻辑
builder.add_edge("fetch_user_info", "assistant")
# 定义工具路由函数
def route_tools(state: State):
    """根据工具类型路由到不同节点"""
    next_node = tools_condition(state)
    # 如果没有调用工具，返回到用户
    if next_node == END:
        return END
    # 获取最后一条 AI 消息
    ai_message = state["messages"][-1]
    # 这里假设单个工具调用
    # 要处理并行工具调用，你需要使用 ANY 条件
    first_tool_call = ai_message.tool_calls[0]
    # 判断是否为敏感工具
    if first_tool_call["name"] in sensitive_tool_names:
        return "sensitive_tools"
    return "safe_tools"
# 添加条件边
builder.add_conditional_edges(
    "assistant", 
    route_tools, 
    ["safe_tools", "sensitive_tools", END]
)
# 工具节点返回助手
builder.add_edge("safe_tools", "assistant")
builder.add_edge("sensitive_tools", "assistant")
# 配置检查点和中断
memory = InMemorySaver()
part_3_graph = builder.compile(
    checkpointer=memory,
    # 新增：图将仅在执行 "sensitive_tools" 节点之前暂停
    # 用户可以在助手继续之前批准或拒绝（甚至更改请求）
    interrupt_before=["sensitive_tools"],
)

```

### 步骤 4：运行对话示例

现在我调试一下新改进的聊天机器人！让我们在以下对话轮次列表上运行它。这次，我们将有更少的确认。

```python
import shutil
import uuid
db = update_dates(db)
thread_id = str(uuid.uuid4())
config = {
    "configurable": {
        "passenger_id": "3442 587242",
        "thread_id": thread_id,
    }
}
tutorial_questions = [
    "Hi there, what time is my flight?",
    "Am i allowed to update my flight to something sooner? I want to leave later today.",
    "Update my flight to sometime next week then",
    "The next available option is great",
    "what about lodging and transportation?",
    "Yeah i think i'd like an affordable hotel for my week-long stay (7 days). And I'll want to rent a car.",
    "OK could you place a reservation for your recommended hotel? It sounds nice.",
    "yes go ahead and book anything that's moderate expense and has availability.",
    "Now for a car, what are my options?",
    "Awesome let's just get the cheapest option. Go ahead and book for 7 days",
    "Cool so now what recommendations do you have on excursions?",
    "Are they available while I'm there?",
    "interesting - i like the museums, what options are there?",
    "OK great pick one and book it for my second day there.",
]
_printed = set()
for question in tutorial_questions:
    events = part_3_graph.stream(
        {"messages": ("user", question)}, 
        config, 
        stream_mode="values"
    )
    for event in events:
        _print_event(event, _printed)
    snapshot = part_3_graph.get_state(config)
    while snapshot.next:
        # 我们有一个中断！代理正在尝试使用工具
        try:
            user_input = input(
                "Do you approve of the above actions? Type 'y' to continue;"
                " otherwise, explain your requested changed.\n\n"
            )
        except:
            user_input = "y"
        if user_input.strip() == "y":
            # 直接继续
            result = part_3_graph.invoke(None, config)
        else:
            # 提供更改说明
            result = part_3_graph.invoke(
                {
                    "messages": [
                        ToolMessage(
                            tool_call_id=event["messages"][-1].tool_calls[0]["id"],
                            content=f"API call denied by user. Reasoning: '{user_input}'. Continue assisting, accounting for the user's input.",
                        )
                    ]
                },
                config,
            )
        snapshot = part_3_graph.get_state(config)

```

现在是不是好多了！

**然而这种设计还存在问题**： 我们给单个提示施加了很大的压力。如果我们想添加更多工具，或者如果每个工具变得更复杂（更多过滤器、更多约束行为的业务逻辑等），工具使用和机器人的整体行为可能会开始下降。

这一部分留在我们下一节中，我们将展示如何通过根据用户意图路由到专家代理或子图来更好地控制不同的用户体验。

通过上面的优化例子，在 AI 自主性和用户控制权之间找到平衡点，让 AI 既能高效工作，又不会越权行事。记住：**AI 应该是助手，而不是替代者。用户始终应该掌握最终决策权。**

通过合理使用中断机制，你可以构建出既智能又可控的 AI 应用，让用户真正信任并依赖你的系统。

# 专用工作流（Specialized Workflows）

在前面两节中，我们已经看到，基于单个 Prompt 和单个大模型（LLM）的 “通用型” 聊天机器人，虽然能处理各种用户意图，但这种方式很难为**特定需求**提供稳定且可控的优质体验。因此，在这一节，我们将采用另一种策略：让系统能够**自动识别用户意图**，并选择合适的 “专用工作流（workflow）” 或“技能（skill）”来满足用户需求。

每一个工作流都聚焦在自己的领域内运行，互相独立地改进，而不会影响到整个助理系统的表现。我们将用户体验划分为多个子图（sub-graphs），整体结构如下：

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/0ca4aace1c74c07213eb61ca221ab72c54c55064.png)

主助理（Primary Assistant）负责接收用户最初的请求，根据查询内容，将任务路由给合适的 “专用助理（Expert Assistant）”。

## 状态管理

我们需要跟踪当前哪个子图正在控制。虽然可以通过消息列表的某些运算来实现, 但使用专门的栈来跟踪会更简单。

在下面的 State 中添加一个 `dialog_state` 列表。每当节点运行并返回 `dialog_state` 值时, 就会调用 `update_dialog_stack` 函数来决定如何应用更新。

```
from typing import Annotated, Literal, Optional
from typing_extensions import TypedDict
from langgraph.graph.message import AnyMessage, add_messages
def update_dialog_stack(left: list[str], right: Optional[str]) -> list[str]:
    """推入或弹出状态。"""
    if right is None:
        return left
    if right == "pop":
        return left[:-1]
    return left + [right]
class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
    user_info: str
    dialog_state: Annotated[
        list[
            Literal[
                "assistant",
                "update_flight",
                "book_car_rental",
                "book_hotel",
                "book_excursion",
            ]
        ],
        update_dialog_stack,
    ]

```

## 创建助手

这次我们将为每个工作流创建一个助手。这意味着需要:

*   航班预订助手
    
*   酒店预订助手
    
*   租车助手
    
*   旅游项目助手
    
*   最后还有一个 "主助手" 来在这些助手之间路由
    

如果你注意观察, 可能会发现这是我们多智能体章节中监督者设计模式的一个例子。

下面定义驱动每个助手的 Runnable 对象。每个 Runnable 都有一个提示词、大语言模型和该助手范围内的工具模式。每个专业 / 委托助手还可以调用 `CompleteOrEscalate` 工具来表示应该将控制流传回主助手。这在它成功完成工作或用户改变主意或需要超出该特定工作流范围的帮助时发生。

```python

from langchain_anthropic import ChatAnthropic
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable, RunnableConfig
from pydantic import BaseModel, Field
class Assistant:
    def __init__(self, runnable: Runnable):
        self.runnable = runnable
    def __call__(self, state: State, config: RunnableConfig):
        while True:
            result = self.runnable.invoke(state)
            if not result.tool_calls and (
                not result.content
                or isinstance(result.content, list)
                and not result.content[0].get("text")
            ):
                messages = state["messages"] + [("user", "请给出真实的输出。")]
                state = {**state, "messages": messages}
            else:
                break
        return {"messages": result}
##它是一个 Pydantic 模型类（BaseModel），
##在 LangGraph / LangChain 体系中，这样的类就表示一个“工具（Tool）”。
##换句话说：模型（LLM）在推理时，如果决定“我该结束任务”或“我无法处理”，它就会调用这个工具，向主助理发出“切换控制权”的信号。
class CompleteOrEscalate(BaseModel):
    """用于标记当前任务完成和/或将对话控制权上报给主助手的工具,
    主助手可以根据用户需求重新路由对话。"""
    cancel: bool = True
    reason: str
    class Config:
        json_schema_extra = {
            "example": {
                "cancel": True,
                "reason": "用户改变了对当前任务的想法。",
            },
            "example 2": {
                "cancel": True,
                "reason": "我已经完全完成了任务。",
            },
            "example 3": {
                "cancel": False,
                "reason": "我需要搜索用户的邮件或日历以获取更多信息。",
            },
        }

```

## 航班预订助手

定义一个 “航班更新助理” 的系统提示模板，告诉模型它的角色、任务范围、行为规范，并动态插入用户航班信息和当前时间，让它能在多助理系统中独立运行、自动接管特定任务。

```python

flight_booking_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "你是处理航班更新的专业助手。"
            " 主助手在用户需要帮助更新预订时将工作委托给你。"
            "与客户确认更新的航班详情并告知任何额外费用。"
            " 搜索时要坚持。如果首次搜索没有结果,扩大查询范围。"
            "如果你需要更多信息或客户改变主意,将任务上报回主助手。"
            " 记住,只有在成功使用相关工具后,预订才算完成。"
            "\n\n当前用户航班信息:\n<Flights>\n{user_info}\n</Flights>"
            "\n当前时间: {time}。"
            "\n\n如果用户需要帮助,但你的工具都不适用,"
            ' 那么"CompleteOrEscalate"对话到主助手。不要浪费用户时间。不要编造无效的工具或函数。',
        ),
        ("placeholder", "{messages}"),
    ]
).partial(time=datetime.now)
update_flight_safe_tools = [search_flights]
update_flight_sensitive_tools = [update_ticket_to_new_flight, cancel_ticket]
update_flight_tools = update_flight_safe_tools + update_flight_sensitive_tools
update_flight_runnable = flight_booking_prompt | llm.bind_tools(
    update_flight_tools + [CompleteOrEscalate]
)

```

## 酒店预订助手

```python

book_hotel_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "你是处理酒店预订的专业助手。"
            "主助手在用户需要帮助预订酒店时将工作委托给你。"
            "根据用户偏好搜索可用酒店并与客户确认预订详情。"
            " 搜索时要坚持。如果首次搜索没有结果,扩大查询范围。"
            "如果你需要更多信息或客户改变主意,将任务上报回主助手。"
            " 记住,只有在成功使用相关工具后,预订才算完成。"
            "\n当前时间: {time}。"
            '\n\n如果用户需要帮助,但你的工具都不适用,那么"CompleteOrEscalate"对话到主助手。'
            " 不要浪费用户时间。不要编造无效的工具或函数。"
            "\n\n一些你应该CompleteOrEscalate的例子:\n"
            " - '这个时节天气怎么样?'\n"
            " - '算了我想我会分开预订'\n"
            " - '我需要弄清楚在那里的交通'\n"
            " - '哦等等我还没订机票我先订机票'\n"
            " - '酒店预订已确认'",
        ),
        ("placeholder", "{messages}"),
    ]
).partial(time=datetime.now)
book_hotel_safe_tools = [search_hotels]
book_hotel_sensitive_tools = [book_hotel, update_hotel, cancel_hotel]
book_hotel_tools = book_hotel_safe_tools + book_hotel_sensitive_tools
book_hotel_runnable = book_hotel_prompt | llm.bind_tools(
    book_hotel_tools + [CompleteOrEscalate]
)

```

## 租车助手

```python

book_car_rental_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "你是处理租车预订的专业助手。"
            "主助手在用户需要帮助预订租车时将工作委托给你。"
            "根据用户偏好搜索可用租车并与客户确认预订详情。"
            " 搜索时要坚持。如果首次搜索没有结果,扩大查询范围。"
            "如果你需要更多信息或客户改变主意,将任务上报回主助手。"
            " 记住,只有在成功使用相关工具后,预订才算完成。"
            "\n当前时间: {time}。"
            "\n\n如果用户需要帮助,但你的工具都不适用,"
            '"CompleteOrEscalate"对话到主助手。不要浪费用户时间。不要编造无效的工具或函数。'
            "\n\n一些你应该CompleteOrEscalate的例子:\n"
            " - '这个时节天气怎么样?'\n"
            " - '有什么航班可用?'\n"
            " - '算了我想我会分开预订'\n"
            " - '哦等等我还没订机票我先订机票'\n"
            " - '租车预订已确认'",
        ),
        ("placeholder", "{messages}"),
    ]
).partial(time=datetime.now)
book_car_rental_safe_tools = [search_car_rentals]
book_car_rental_sensitive_tools = [
    book_car_rental,
    update_car_rental,
    cancel_car_rental,
]
book_car_rental_tools = book_car_rental_safe_tools + book_car_rental_sensitive_tools
book_car_rental_runnable = book_car_rental_prompt | llm.bind_tools(
    book_car_rental_tools + [CompleteOrEscalate]
)

```

## 旅游项目助手

```python

book_excursion_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "你是处理旅行推荐的专业助手。"
            "主助手在用户需要帮助预订推荐旅行时将工作委托给你。"
            "根据用户偏好搜索可用的旅行推荐并与客户确认预订详情。"
            "如果你需要更多信息或客户改变主意,将任务上报回主助手。"
            " 搜索时要坚持。如果首次搜索没有结果,扩大查询范围。"
            " 记住,只有在成功使用相关工具后,预订才算完成。"
            "\n当前时间: {time}。"
            '\n\n如果用户需要帮助,但你的工具都不适用,那么"CompleteOrEscalate"对话到主助手。不要浪费用户时间。不要编造无效的工具或函数。'
            "\n\n一些你应该CompleteOrEscalate的例子:\n"
            " - '算了我想我会分开预订'\n"
            " - '我需要弄清楚在那里的交通'\n"
            " - '哦等等我还没订机票我先订机票'\n"
            " - '旅游项目预订已确认!'",
        ),
        ("placeholder", "{messages}"),
    ]
).partial(time=datetime.now)
book_excursion_safe_tools = [search_trip_recommendations]
book_excursion_sensitive_tools = [book_excursion, update_excursion, cancel_excursion]
book_excursion_tools = book_excursion_safe_tools + book_excursion_sensitive_tools
book_excursion_runnable = book_excursion_prompt | llm.bind_tools(
    book_excursion_tools + [CompleteOrEscalate]
)

```

## 主助手

```python

#“我可以调用一个名为 ToFlightBookingAssistant 的工具，并传入 request 参数来把任务交给航班助手。
class ToFlightBookingAssistant(BaseModel):
    """将工作转移到专业助手以处理航班更新和取消。"""
    request: str = Field(
        description="航班更新助手在继续之前需要澄清的任何必要的后续问题。"
    )
class ToBookCarRental(BaseModel):
    """将工作转移到专业助手以处理租车预订。"""
    location: str = Field(
        description="用户想要租车的地点。"
    )
    start_date: str = Field(description="租车的开始日期。")
    end_date: str = Field(description="租车的结束日期。")
    request: str = Field(
        description="用户关于租车的任何额外信息或要求。"
    )
    class Config:
        json_schema_extra = {
            "example": {
                "location": "巴塞尔",
                "start_date": "2023-07-01",
                "end_date": "2023-07-05",
                "request": "我需要一辆带自动变速器的紧凑型车。",
            }
        }
class ToHotelBookingAssistant(BaseModel):
    """将工作转移到专业助手以处理酒店预订。"""
    location: str = Field(
        description="用户想要预订酒店的地点。"
    )
    checkin_date: str = Field(description="酒店的入住日期。")
    checkout_date: str = Field(description="酒店的退房日期。")
    request: str = Field(
        description="用户关于酒店预订的任何额外信息或要求。"
    )
    class Config:
        json_schema_extra = {
            "example": {
                "location": "苏黎世",
                "checkin_date": "2023-08-15",
                "checkout_date": "2023-08-20",
                "request": "我更喜欢靠近市中心的酒店,房间要有景观。",
            }
        }
class ToBookExcursion(BaseModel):
    """将工作转移到专业助手以处理旅行推荐和其他旅游项目预订。"""
    location: str = Field(
        description="用户想要预订推荐旅行的地点。"
    )
    request: str = Field(
        description="用户关于旅行推荐的任何额外信息或要求。"
    )
    class Config:
        json_schema_extra = {
            "example": {
                "location": "卢塞恩",
                "request": "用户对户外活动和风景优美的景色感兴趣。",
            }
        }
# 顶层助手执行一般问答并将专业任务委托给其他助手
# 任务委托是语义路由的简单形式 / 进行简单的意图检测
llm = ChatAnthropic(model="claude-3-sonnet-20240229", temperature=1)
primary_assistant_prompt = ChatPromptTemplate.from_messages(
    [
        (
        ("placeholder", "{messages}"),
    ]         "system",
            "你是瑞士航空公司的有用客户支持助手。"
            "你的主要职责是搜索航班信息和公司政策以回答客户查询。"
            "如果客户要求更新或取消航班、预订租车、预订酒店或获取旅行推荐,"
            "通过调用相应工具将任务委托给适当的专业助手。你自己无法进行这些类型的更改。"
            " 只有专业助手被授权为用户执行此操作。"
            "用户不知道不同的专业助手,所以不要提及它们;只需通过函数调用悄悄委托。"
            "向客户提供详细信息,并在得出信息不可用的结论之前始终再次检查数据库。"
            " 搜索时要坚持。如果首次搜索没有结果,扩大查询范围。"
            " 如果搜索结果为空,在放弃之前扩大搜索范围。"
            "\n\n当前用户航班信息:\n<Flights>\n{user_info}\n</Flights>"
            "\n当前时间: {time}。",
        ),
).partial(time=datetime.now)
primary_assistant_tools = [
    TavilySearchResults(max_results=1),
    search_flights,
    lookup_policy,
]
assistant_runnable = primary_assistant_prompt | llm.bind_tools(
    primary_assistant_tools
    + [
        ToFlightBookingAssistant,
        ToBookCarRental,
        ToHotelBookingAssistant,
        ToBookExcursion,
    ]
)

```

## 创建入口节点

我们即将创建图谱。在前面的章节中, 我们做出了设计决策, 让所有节点之间共享消息状态。这很强大, 因为每个委托助手都可以看到整个用户旅程并拥有共享上下文。但是, 这意味着较弱的大语言模型很容易对其特定范围感到困惑。为了标记主助手和委托工作流之间的 "交接"(并完成路由器的工具调用), 我们将向状态添加一个 ToolMessage。

## 工具函数

创建一个函数为每个工作流创建一个 "入口" 节点, 说明 "当前助手是 assistant_name"。

```python

from typing import Callable
from langchain_core.messages import ToolMessage
def create_entry_node(assistant_name: str, new_dialog_state: str) -> Callable:
    def entry_node(state: State) -> dict:
        tool_call_id = state["messages"][-1].tool_calls[0]["id"]
        return {
            "messages": [
                ToolMessage(
                    content=f"助手现在是{assistant_name}。回顾主助手和用户之间的上述对话。"
                    f" 用户的意图未得到满足。使用提供的工具来帮助用户。记住,你是{assistant_name},"
                    " 只有在你成功调用适当的工具之后,预订、更新或其他操作才算完成。"
                    " 如果用户改变主意或需要其他任务的帮助,调用CompleteOrEscalate函数让主助手接管控制。"
                    " 不要提及你是谁 - 只需作为助手的代理。",
                    tool_call_id=tool_call_id,
                )
            ],
            "dialog_state": new_dialog_state,
        }
    return entry_node

```

## 定义图谱

那现在我们开始构建图谱了。和以前一样, 我们将从一个节点开始, 用用户当前信息预填充状态。

```
from typing import Literal
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import StateGraph
from langgraph.prebuilt import tools_condition
builder = StateGraph(State)
def user_info(state: State):
    return {"user_info": fetch_user_flight_information.invoke({})}
builder.add_node("fetch_user_info", user_info)
builder.add_edge(START, "fetch_user_info")

```

现在我们将开始添加专业化工作流。每个小工作流看起来与第 3 部分的完整图谱非常相似, 使用 5 个节点:

enter_*: 使用上面定义的 create_entry_node 工具添加 ToolMessage, 表示新的专业助手正在掌舵。

Assistant: 提示词 + LLM 组合, 接收当前状态并使用工具、向用户提问或结束工作流 (返回主助手)。

***_safe_tools**: 助手可以使用的 "只读" 工具, 无需用户确认。

***_sensitive_tools**: 具有 "写" 访问权限的工具, 需要用户确认 (编译图谱时将分配 interrupt_before)。

leave_skill: 弹出 dialog_state 以表示主助手重新控制。

由于它们的相似性, 我们可以定义一个工厂函数来生成这些。因为这是教程, 我们将明确定义每一个。

### 航班预订助手图谱

首先, 创建专门管理更新和取消航班用户旅程的航班预订助手。

```python

# 航班预订助手
builder.add_node(
    "enter_update_flight",
    create_entry_node("航班更新和预订助手", "update_flight"),
)
builder.add_node("update_flight", Assistant(update_flight_runnable))
builder.add_edge("enter_update_flight", "update_flight")
builder.add_node(
    "update_flight_sensitive_tools",
    create_tool_node_with_fallback(update_flight_sensitive_tools),
)
builder.add_node(
    "update_flight_safe_tools",
    create_tool_node_with_fallback(update_flight_safe_tools),
)
def route_update_flight(state: State):
    route = tools_condition(state)
    if route == END:
        return END
    tool_calls = state["messages"][-1].tool_calls
    did_cancel = any(tc["name"] == CompleteOrEscalate.__name__ for tc in tool_calls)
    if did_cancel:
        return "leave_skill"
    safe_toolnames = [t.name for t in update_flight_safe_tools]
    if all(tc["name"] in safe_toolnames for tc in tool_calls):
        return "update_flight_safe_tools"
    return "update_flight_sensitive_tools"
builder.add_edge("update_flight_sensitive_tools", "update_flight")
builder.add_edge("update_flight_safe_tools", "update_flight")
builder.add_conditional_edges(
    "update_flight",
    route_update_flight,
    ["update_flight_sensitive_tools", "update_flight_safe_tools", "leave_skill", END],
)
# 此节点将被所有专业助手共享用于退出
def pop_dialog_state(state: State) -> dict:
    """弹出对话栈并返回主助手。
    这让完整图谱明确跟踪对话流程并将控制委托给特定子图。
    """
    messages = []
    if state["messages"][-1].tool_calls:
        # 注意:当前不处理LLM执行并行工具调用的边缘情况
        messages.append(
            ToolMessage(
                content="恢复与主助手的对话。请回顾过去的对话并根据需要帮助用户。",
                tool_call_id=state["messages"][-1].tool_calls[0]["id"],
            )
        )
    return {
        "dialog_state": "pop",
        "messages": messages,
    }
builder.add_node("leave_skill", pop_dialog_state)
builder.add_edge("leave_skill", "primary_assistant")

```

### 租车助手图谱

接下来, 创建租车助手图谱以满足所有租车需求。

```python

# 租车助手
builder.add_node(
    "enter_book_car_rental",
    create_entry_node("租车助手", "book_car_rental"),
)
builder.add_node("book_car_rental", Assistant(book_car_rental_runnable))
builder.add_edge("enter_book_car_rental", "book_car_rental")
builder.add_node(
    "book_car_rental_safe_tools",
    create_tool_node_with_fallback(book_car_rental_safe_tools),
)
builder.add_node(
    "book_car_rental_sensitive_tools",
    create_tool_node_with_fallback(book_car_rental_sensitive_tools),
)
def route_book_car_rental(state: State):
    route = tools_condition(state)
    if route == END:
        return END
    tool_calls = state["messages"][-1].tool_calls
    did_cancel = any(tc["name"] == CompleteOrEscalate.__name__ for tc in tool_calls)
    if did_cancel:
        return "leave_skill"
    safe_toolnames = [t.name for t in book_car_rental_safe_tools]
    if all(tc["name"] in safe_toolnames for tc in tool_calls):
        return "book_car_rental_safe_tools"
    return "book_car_rental_sensitive_tools"
builder.add_edge("book_car_rental_sensitive_tools", "book_car_rental")
builder.add_edge("book_car_rental_safe_tools", "book_car_rental")
builder.add_conditional_edges(
    "book_car_rental",
    route_book_car_rental,
    [
        "book_car_rental_safe_tools",
        "book_car_rental_sensitive_tools",
        "leave_skill",
        END,
    ],
)

```

### 酒店预订工作流

然后定义酒店预订工作流。

```python

# 酒店预订助手
builder.add_node(
    "enter_book_hotel", create_entry_node("酒店预订助手", "book_hotel")
)
builder.add_node("book_hotel", Assistant(book_hotel_runnable))
builder.add_edge("enter_book_hotel", "book_hotel")
builder.add_node(
    "book_hotel_safe_tools",
    create_tool_node_with_fallback(book_hotel_safe_tools),
)
builder.add_node(
    "book_hotel_sensitive_tools",
    create_tool_node_with_fallback(book_hotel_sensitive_tools),
)
def route_book_hotel(state: State):
    route = tools_condition(state)
    if route == END:
        return END
    tool_calls = state["messages"][-1].tool_calls
    did_cancel = any(tc["name"] == CompleteOrEscalate.__name__ for tc in tool_calls)
    if did_cancel:
        return "leave_skill"
    tool_names = [t.name for t in book_hotel_safe_tools]
    if all(tc["name"] in tool_names for tc in tool_calls):
        return "book_hotel_safe_tools"
    return "book_hotel_sensitive_tools"
builder.add_edge("book_hotel_sensitive_tools", "book_hotel")
builder.add_edge("book_hotel_safe_tools", "book_hotel")
builder.add_conditional_edges(
    "book_hotel",
    route_book_hotel,
    ["leave_skill", "book_hotel_safe_tools", "book_hotel_sensitive_tools", END],
)

```

### 旅游项目助手

之后, 定义旅游项目助手。

```python

# 旅游项目助手
builder.add_node(
    "enter_book_excursion",
    create_entry_node("旅行推荐助手", "book_excursion"),
)
builder.add_node("book_excursion", Assistant(book_excursion_runnable))
builder.add_edge("enter_book_excursion", "book_excursion")
builder.add_node(
    "book_excursion_safe_tools",
    create_tool_node_with_fallback(book_excursion_safe_tools),
)
builder.add_node(
    "book_excursion_sensitive_tools",
    create_tool_node_with_fallback(book_excursion_sensitive_tools),
)
def route_book_excursion(state: State):
    route = tools_condition(state)
    if route == END:
        return END
    tool_calls = state["messages"][-1].tool_calls
    did_cancel = any(tc["name"] == CompleteOrEscalate.__name__ for tc in tool_calls)
    if did_cancel:
        return "leave_skill"
    tool_names = [t.name for t in book_excursion_safe_tools]
    if all(tc["name"] in tool_names for tc in tool_calls):
        return "book_excursion_safe_tools"
    return "book_excursion_sensitive_tools"
builder.add_edge("book_excursion_sensitive_tools", "book_excursion")
builder.add_edge("book_excursion_safe_tools", "book_excursion")
builder.add_conditional_edges(
    "book_excursion",
    route_book_excursion,
    ["book_excursion_safe_tools", "book_excursion_sensitive_tools", "leave_skill", END],
)

```

### 主助手图谱

最后, 创建主助手。

```python

# 主助手
builder.add_node("primary_assistant", Assistant(assistant_runnable))
builder.add_node(
    "primary_assistant_tools", create_tool_node_with_fallback(primary_assistant_tools)
)
def route_primary_assistant(state: State):
    route = tools_condition(state)
    if route == END:
        return END
    tool_calls = state["messages"][-1].tool_calls
    if tool_calls:
        if tool_calls[0]["name"] == ToFlightBookingAssistant.__name__:
            return "enter_update_flight"
        elif tool_calls[0]["name"] == ToBookCarRental.__name__:
            return "enter_book_car_rental"
        elif tool_calls[0]["name"] == ToHotelBookingAssistant.__name__:
            return "enter_book_hotel"
        elif tool_calls[0]["name"] == ToBookExcursion.__name__:
            return "enter_book_excursion"
        return "primary_assistant_tools"
    raise ValueError("无效的路由")
# 助手可以路由到委托助手之一,
# 直接使用工具,或直接响应用户
builder.add_conditional_edges(
    "primary_assistant",
    route_primary_assistant,
    [
        "enter_update_flight",
        "enter_book_car_rental",
        "enter_book_hotel",
        "enter_book_excursion",
        "primary_assistant_tools",
        END,
    ],
)
builder.add_edge("primary_assistant_tools", "primary_assistant")
# 每个委托工作流都可以直接响应用户
# 当用户响应时,我们希望返回到当前活动的工作流
def route_to_workflow(
    state: State,
) -> Literal[
    "primary_assistant",
    "update_flight",
    "book_car_rental",
    "book_hotel",
    "book_excursion",
]:
    """如果我们处于委托状态,直接路由到相应的助手。"""
    dialog_state = state.get("dialog_state")
    if not dialog_state:
        return "primary_assistant"
    return dialog_state[-1]
builder.add_conditional_edges("fetch_user_info", route_to_workflow)
# 编译图谱
memory = InMemorySaver()
part_4_graph = builder.compile(
    checkpointer=memory,
    # 让用户批准或拒绝使用敏感工具
    interrupt_before=[
        "update_flight_sensitive_tools",
        "book_car_rental_sensitive_tools",
        "book_hotel_sensitive_tools",
        "book_excursion_sensitive_tools",
    ],
)

```

可视化图谱

```python

from IPython.display import Image, display
try:
    display(Image(part_4_graph.get_graph(xray=True).draw_mermaid_png()))
except Exception:
    # 这需要一些额外的依赖项,是可选的
    pass

```

![](https://raw.githubusercontent.com/vincentruan/picgo/main/piclist/9cb1168a8c4c1badd660a53ddc65e747eb69a2dd.png)

## 运行对话

完成了! 让我们在以下对话轮次列表上运行它。这次, 我们需要的确认会少得多。

```python

import shutil
import uuid
# 使用备份文件更新,这样我们可以在每个部分从原始位置重新开始
db = update_dates(db)
thread_id = str(uuid.uuid4())
config = {
    "configurable": {
        # passenger_id 用于我们的航班工具
        # 获取用户的航班信息
        "passenger_id": "3442 587242",
        # 检查点通过 thread_id 访问
        "thread_id": thread_id,
    }
}
_printed = set()
# 我们可以重用第1部分的教程问题来看看它的表现
for question in tutorial_questions:
    events = part_4_graph.stream(
        {"messages": ("user", question)}, config, stream_mode="values"
    )
    for event in events:
        _print_event(event, _printed)
    snapshot = part_4_graph.get_state(config)
    while snapshot.next:
        # 我们遇到了中断!代理正在尝试使用工具,用户可以批准或拒绝它
        # 注意:此代码都在图谱外部。通常,你会将输出流式传输到UI。
        # 然后,当用户提供输入时,你会通过API调用触发新的运行。
        try:
            user_input = input(
                "你是否批准上述操作?输入 'y' 继续;"
                " 否则,解释你请求的更改。\n\n"
            )
        except:
            user_input = "y"
        if user_input.strip() == "y":
            # 只是继续
            result = part_4_graph.invoke(
                None,
                config,
            )
        else:
            # 通过提供有关请求更改/改变主意的说明来满足工具调用
            result = part_4_graph.invoke(
                {
                    "messages": [
                        ToolMessage(
                            tool_call_id=event["messages"][-1].tool_calls[0]["id"],
                            content=f"API调用被用户拒绝。原因:'{user_input}'。继续提供帮助,考虑用户的输入。",
                        )
                    ]
                },
                config,
            )
        snapshot = part_4_graph.get_state(config)

```

这里我们来梳理下它的工作原理，

1. **使用** `dialog_state` 列表跟踪当前活动的助手，当进入专业助手时, 将其名称推入栈，当完成或上报时, 从栈中弹出，这使得系统知道应该将用户的下一个消息路由到哪里。

2. **入口节点 (**`create_entry_node`): 添加 ToolMessage 告诉专业助手它现在负责处理，退出节点 (`pop_dialog_state`): 将控制权返回主助手并清理状态。

3. **每个专业助手有两类工具: 安全工具 (safe_tools): 只读操作, 如搜索, 无需用户批准，敏感工具 (sensitive_tools): 写操作, 如预订、更新、取消, 需要用户确认**

4. **主助手: 检测意图并路由到相应的专业助手，专业助手: 在安全工具、敏感工具、上报 (CompleteOrEscalate) 和结束之间路由，用户输入: 根据** `dialog_state` 路由回当前活动的工作流。

5. **通过** `interrupt_before` 在执行敏感操作前暂停, 等待用户批准: 用户输入'y' → 继续执行，用户提供其他输入 → 创建包含用户反馈的 ToolMessage, 让助手调整。

## 总结

通过将单一的 "万能" 助手拆分为专业化的子工作流, 我们创建了一个更强大、更可维护的系统。主助手充当智能路由器, 根据用户意图将任务委托给最合适的专家。每个专家都有自己的提示词、工具集和工作流程, 可以提供更加精准和高质量的用户体验。

这种模式特别适合复杂的多领域应用, 如客户服务、旅行预订、电商等场景, 其中不同类型的用户请求需要不同的专业知识和处理流程。