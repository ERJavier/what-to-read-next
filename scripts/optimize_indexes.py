#!/usr/bin/env python3
"""
Optimize database indexes for performance.

This script:
1. Calculates optimal IVFFlat index parameters based on table size
2. Creates or recreates the vector index with optimal settings
3. Analyzes the table for query planner optimization
4. Provides index usage statistics
"""
import math
import os
import sys
from pathlib import Path

import psycopg

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.config import settings

def get_table_size(conn) -> int:
    """Get the number of records in the books table."""
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM books;")
        result = cur.fetchone()
        return result[0] if result else 0


def calculate_optimal_lists(table_size: int) -> int:
    """
    Calculate optimal lists parameter for IVFFlat index.
    
    Recommended formula: lists = sqrt(total_rows) / 1000
    But keep within reasonable bounds (100 to 10000)
    """
    if table_size == 0:
        return 100  # Default for empty table
    
    # Calculate based on formula
    optimal_lists = int(math.sqrt(table_size) / 1000)
    
    # Keep within reasonable bounds
    # Minimum 100 for small tables
    # Maximum 10000 for very large tables (pgvector recommendation)
    optimal_lists = max(100, min(10000, optimal_lists))
    
    return optimal_lists


def index_exists(conn, index_name: str) -> bool:
    """Check if an index exists."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT EXISTS (
                SELECT 1 
                FROM pg_indexes 
                WHERE schemaname = 'public' 
                AND indexname = %s
            );
            """,
            (index_name,)
        )
        result = cur.fetchone()
        return result[0] if result else False


def get_index_info(conn, index_name: str):
    """Get information about an existing index."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 
                indexname,
                indexdef
            FROM pg_indexes
            WHERE schemaname = 'public' 
            AND indexname = %s;
            """,
            (index_name,)
        )
        return cur.fetchone()


def create_vector_index(conn, lists: int, drop_existing: bool = False):
    """
    Create or recreate the IVFFlat vector index.
    
    Args:
        conn: Database connection
        lists: Number of lists for IVFFlat index
        drop_existing: Whether to drop existing index first
    """
    index_name = "books_embedding_idx"
    
    with conn.cursor() as cur:
        if drop_existing and index_exists(conn, index_name):
            print(f"  Dropping existing index '{index_name}'...")
            cur.execute(f"DROP INDEX IF EXISTS {index_name};")
            conn.commit()
            print(f"  ✅ Index dropped")
        
        print(f"  Creating IVFFlat index with lists={lists}...")
        print(f"  ⏳ This may take several minutes for large tables...")
        
        try:
            cur.execute(
                f"""
                CREATE INDEX {index_name}
                ON books 
                USING ivfflat (embedding vector_cosine_ops) 
                WITH (lists = {lists});
                """
            )
            conn.commit()
            print(f"  ✅ Index created successfully")
        except psycopg.Error as e:
            conn.rollback()
            print(f"  ❌ Error creating index: {e}")
            raise


def analyze_table(conn):
    """Run ANALYZE on the books table to update statistics."""
    print("\n📊 Analyzing table for query planner optimization...")
    with conn.cursor() as cur:
        cur.execute("ANALYZE books;")
        conn.commit()
    print("  ✅ Table analyzed")


def get_index_statistics(conn):
    """Get index usage and size statistics."""
    print("\n📈 Index Statistics:")
    with conn.cursor() as cur:
        # Get index sizes
        cur.execute(
            """
            SELECT 
                schemaname,
                tablename,
                indexname,
                pg_size_pretty(pg_relation_size(indexrelid)) as index_size
            FROM pg_stat_user_indexes
            WHERE schemaname = 'public' 
            AND tablename = 'books'
            ORDER BY pg_relation_size(indexrelid) DESC;
            """
        )
        indexes = cur.fetchall()
        
        if indexes:
            print("  Index Sizes:")
            for schema, table, idx_name, size in indexes:
                print(f"    - {idx_name}: {size}")
        else:
            print("  No index statistics available")
        
        # Get table size
        cur.execute(
            """
            SELECT 
                pg_size_pretty(pg_total_relation_size('books')) as total_size,
                pg_size_pretty(pg_relation_size('books')) as table_size;
            """
        )
        total_size, table_size = cur.fetchone()
        print(f"\n  Table Size: {table_size}")
        print(f"  Total Size (with indexes): {total_size}")


def main():
    """Main function to optimize database indexes."""
    print("🔧 Database Index Optimization")
    print("=" * 50)
    
    # Get database connection
    try:
        conn = psycopg.connect(settings.database_url)
        print(f"✅ Connected to database")
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        sys.exit(1)
    
    try:
        # Get table size
        print("\n📊 Checking table size...")
        table_size = get_table_size(conn)
        print(f"  Records in books table: {table_size:,}")
        
        if table_size == 0:
            print("  ⚠️  Table is empty. Skipping index optimization.")
            return
        
        # Calculate optimal lists parameter
        optimal_lists = calculate_optimal_lists(table_size)
        print(f"\n🎯 Optimal index configuration:")
        print(f"  Recommended lists parameter: {optimal_lists}")
        print(f"  (Formula: sqrt({table_size:,}) / 1000 ≈ {int(math.sqrt(table_size) / 1000)})")
        
        # Check if index exists
        index_name = "books_embedding_idx"
        existing_index = index_exists(conn, index_name)
        
        if existing_index:
            print(f"\n⚠️  Index '{index_name}' already exists")
            index_info = get_index_info(conn, index_name)
            if index_info:
                print(f"  Current definition: {index_info[1]}")
            
            # Check if we should recreate it
            response = input("\n  Recreate index with optimal parameters? (y/N): ").strip().lower()
            if response == 'y':
                create_vector_index(conn, optimal_lists, drop_existing=True)
            else:
                print("  Skipping index recreation")
        else:
            # Create new index
            print(f"\n🔨 Creating vector index...")
            create_vector_index(conn, optimal_lists, drop_existing=False)
        
        # Analyze table
        analyze_table(conn)
        
        # Show statistics
        get_index_statistics(conn)
        
        print("\n✅ Index optimization complete!")
        print("\n💡 Tips:")
        print("  - Monitor query performance with EXPLAIN ANALYZE")
        print("  - Re-optimize if table size changes significantly")
        print("  - Higher 'lists' = faster queries but slower index creation")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
