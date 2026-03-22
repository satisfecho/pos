"""
Update wine prices from API to use bottle prices instead of glass prices.

This script fetches all wines from the Tusumiller API and updates prices
to use the bottle price (price field) instead of glass price (pricecopa).

Usage:
    python -m app.seeds.update_wine_prices
"""

import sys
from sqlmodel import Session, select
from app.db import engine
from app.models import Provider, ProviderProduct

try:
    import requests
except ImportError:
    print("Error: 'requests' library is required. Install it with: pip install requests")
    sys.exit(1)

try:
    from app.seeds.wine_import import API_ENDPOINT, COOKIES, FORM_DATA_BASE, HEADERS
except ImportError:
    print("Error: Could not import Tusumiller API settings from app.seeds.wine_import")
    sys.exit(1)


def fetch_all_wines_from_api() -> dict[str, dict]:
    """Fetch all wines from API and return dict mapping external_id to price data."""
    all_wines = {}
    page = 1
    seen_ids = set()
    
    # Fetch wines from all categories
    categories = ["", "18010", "18011", "18013", "18014", "18015", "18016"]  # All wine categories
    
    for category in categories:
        page = 1
        while True:
            form_data = FORM_DATA_BASE.copy()
            form_data["page"] = str(page)
            form_data["categories"] = category

            try:
                response = requests.post(API_ENDPOINT, headers=HEADERS, cookies=COOKIES, data=form_data, timeout=30)
                response.raise_for_status()
                data = response.json()
                wines = data.get("data", [])
                
                if not wines:
                    break
                
                for wine in wines:
                    wine_id = str(wine.get("id") or wine.get("idProduct") or "")
                    if wine_id and wine_id not in seen_ids:
                        seen_ids.add(wine_id)
                        # Use bottle price, fallback to glass price if bottle is 0 or None
                        bottle_price = wine.get("price") or 0
                        glass_price = wine.get("pricecopa") or 0
                        price = bottle_price if bottle_price > 0 else glass_price
                        
                        if price and price > 0:
                            all_wines[wine_id] = {
                                "price": price,
                                "bottle_price": bottle_price,
                                "glass_price": glass_price,
                                "name": wine.get("nombre", ""),
                            }
                
                total = data.get("total", 0)
                if len(seen_ids) >= total or len(wines) == 0:
                    break
                
                page += 1
            except Exception as e:
                print(f"Error fetching page {page} for category {category}: {e}")
                break
    
    return all_wines


def update_wine_prices() -> dict[str, int]:
    """Update wine prices in database from API data."""
    print("Fetching wines from API...")
    all_wines = fetch_all_wines_from_api()
    print(f"Fetched {len(all_wines)} wines from API")
    
    with Session(engine) as session:
        provider = session.exec(select(Provider).where(Provider.name == "Tusumiller")).first()
        if not provider:
            print("Error: Tusumiller provider not found")
            return {"updated": 0, "not_found": 0, "unchanged": 0}
        
        products = session.exec(
            select(ProviderProduct).where(ProviderProduct.provider_id == provider.id)
        ).all()
        
        updated = 0
        not_found = 0
        unchanged = 0
        
        for pp in products:
            if pp.external_id in all_wines:
                api_data = all_wines[pp.external_id]
                new_price = api_data["price"]
                if new_price and new_price > 0:
                    new_price_cents = int(new_price * 100)
                    if pp.price_cents != new_price_cents:
                        old_price = pp.price_cents / 100 if pp.price_cents else 0
                        pp.price_cents = new_price_cents
                        session.add(pp)
                        updated += 1
                        if updated <= 10:  # Show first 10
                            print(f"  {pp.name}: €{old_price:.2f} -> €{new_price:.2f} (bottle={api_data['bottle_price']}, glass={api_data['glass_price']})")
                    else:
                        unchanged += 1
            else:
                not_found += 1
        
        session.commit()
        
        return {
            "updated": updated,
            "not_found": not_found,
            "unchanged": unchanged,
        }


if __name__ == "__main__":
    print("Updating wine prices from API...")
    result = update_wine_prices()
    print("\nComplete!")
    print(f"  Updated: {result['updated']}")
    print(f"  Unchanged: {result['unchanged']}")
    print(f"  Not found in API: {result['not_found']}")
