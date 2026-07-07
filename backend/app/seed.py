"""The demo cellar.

A tastefully over-the-top collection worthy of an ultra-high-net-worth client.
All numbers are per-unit CHF and entirely fictional. Please do not use this as
investment advice, though the DRC is genuinely a good hold.
"""

from __future__ import annotations

from datetime import date

from .models import Bottle, BottleSize, Region


def seed_bottles() -> list[Bottle]:
    raw = [
        dict(name="Château Margaux", producer="Château Margaux", region=Region.BORDEAUX,
             vintage=2015, quantity=12, size=BottleSize.STANDARD, purchase_price_chf=620,
             market_price_chf=890, purchase_date=date(2018, 4, 12), drink_from=2025,
             drink_to=2055, apogee_year=2038, critic_score=98,
             notes="En primeur allocation. The 2015 is a legend in the making."),
        dict(name="Romanée-Conti Grand Cru", producer="Domaine de la Romanée-Conti",
             region=Region.BURGUNDY, vintage=2018, quantity=3, size=BottleSize.STANDARD,
             purchase_price_chf=18000, market_price_chf=26500, purchase_date=date(2021, 1, 20),
             drink_from=2030, drink_to=2060, apogee_year=2045, critic_score=100,
             notes="The crown jewel. Insured separately. Do not, under any circumstances, drink."),
        dict(name="Clos du Mesnil", producer="Krug", region=Region.CHAMPAGNE,
             vintage=2006, quantity=6, size=BottleSize.STANDARD, purchase_price_chf=950,
             market_price_chf=1450, purchase_date=date(2016, 11, 3), drink_from=2018,
             drink_to=2040, apogee_year=2024, critic_score=97,
             notes="Single-vineyard blanc de blancs, drinking gloriously — and still climbing in value."),
        dict(name="Château d'Yquem", producer="Château d'Yquem", region=Region.BORDEAUX,
             vintage=2001, quantity=6, size=BottleSize.HALF, purchase_price_chf=380,
             market_price_chf=520, purchase_date=date(2012, 6, 8), drink_from=2015,
             drink_to=2070, apogee_year=2038, critic_score=100,
             notes="Half-bottles for dessert service. Practically immortal."),
        dict(name="Screaming Eagle Cabernet Sauvignon", producer="Screaming Eagle",
             region=Region.NAPA, vintage=2018, quantity=3, size=BottleSize.STANDARD,
             purchase_price_chf=3500, market_price_chf=4200, purchase_date=date(2021, 9, 14),
             drink_from=2024, drink_to=2045, apogee_year=2033, critic_score=99,
             notes="Cult Napa. Mailing-list only — good luck getting more."),
        dict(name="Sassicaia", producer="Tenuta San Guido", region=Region.TUSCANY,
             vintage=2016, quantity=12, size=BottleSize.STANDARD, purchase_price_chf=250,
             market_price_chf=340, purchase_date=date(2019, 3, 2), drink_from=2022,
             drink_to=2046, apogee_year=2032, critic_score=97, notes="The original Super Tuscan."),
        dict(name="Barbaresco", producer="Gaja", region=Region.PIEDMONT, vintage=2017,
             quantity=6, size=BottleSize.STANDARD, purchase_price_chf=280, market_price_chf=360,
             purchase_date=date(2020, 5, 19), drink_from=2024, drink_to=2044, apogee_year=2031,
             critic_score=95, notes="Nebbiolo aristocracy."),
        dict(name="Châteauneuf-du-Pape", producer="Château Rayas", region=Region.RHONE,
             vintage=2016, quantity=6, size=BottleSize.STANDARD, purchase_price_chf=520,
             market_price_chf=780, purchase_date=date(2019, 10, 11), drink_from=2026,
             drink_to=2050, apogee_year=2038, critic_score=96, notes="Pure Grenache, cult following."),
        dict(name="Scharzhofberger Riesling Auslese", producer="Egon Müller", region=Region.MOSEL,
             vintage=2019, quantity=6, size=BottleSize.STANDARD, purchase_price_chf=420,
             market_price_chf=480, purchase_date=date(2021, 7, 7), drink_from=2025, drink_to=2060,
             apogee_year=2042, critic_score=96, notes="The Mosel's finest. Ages for decades."),
        dict(name="Gran Reserva 904", producer="La Rioja Alta", region=Region.RIOJA,
             vintage=2011, quantity=12, size=BottleSize.STANDARD, purchase_price_chf=65,
             market_price_chf=88, purchase_date=date(2017, 2, 28), drink_from=2020, drink_to=2038,
             apogee_year=2025, critic_score=94,
             notes="Classical Rioja at its peak. Modest upside left — pour it at the next board dinner."),
        dict(name="Meursault Perrières", producer="Coche-Dury", region=Region.BURGUNDY,
             vintage=2014, quantity=6, size=BottleSize.STANDARD, purchase_price_chf=180,
             market_price_chf=240, purchase_date=date(2017, 6, 15), drink_from=2018, drink_to=2025,
             apogee_year=2022, critic_score=95,
             notes="White Burgundy — premox risk. The window has closed; drink immediately or accept the loss."),
        dict(name="Vintage Port", producer="Taylor's", region=Region.PORT, vintage=2017,
             quantity=12, size=BottleSize.STANDARD, purchase_price_chf=95, market_price_chf=120,
             purchase_date=date(2019, 12, 1), drink_from=2035, drink_to=2085, apogee_year=2058,
             critic_score=98, notes="Declared vintage. Lay it down for the grandchildren."),
        dict(name="Cristal", producer="Louis Roederer", region=Region.CHAMPAGNE, vintage=2014,
             quantity=6, size=BottleSize.MAGNUM, purchase_price_chf=480, market_price_chf=600,
             purchase_date=date(2020, 8, 22), drink_from=2024, drink_to=2042, apogee_year=2030,
             critic_score=96, notes="Magnums — the only civilised format for Champagne."),
        dict(name="Château Latour", producer="Château Latour", region=Region.BORDEAUX,
             vintage=2010, quantity=6, size=BottleSize.STANDARD, purchase_price_chf=780,
             market_price_chf=1350, purchase_date=date(2013, 5, 30), drink_from=2030,
             drink_to=2065, apogee_year=2045, critic_score=100, notes="Legendary vintage. First growth."),
        dict(name="Opus One", producer="Opus One", region=Region.NAPA, vintage=2018,
             quantity=6, size=BottleSize.STANDARD, purchase_price_chf=320, market_price_chf=410,
             purchase_date=date(2021, 4, 4), drink_from=2024, drink_to=2044, apogee_year=2033,
             critic_score=96, notes="Mondavi–Rothschild joint venture."),
    ]
    return [Bottle(**item) for item in raw]
