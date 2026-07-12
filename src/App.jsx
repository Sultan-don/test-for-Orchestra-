import React, { useState } from 'react';
import { ShoppingCart, Star, Search, Heart, Menu, X, Package, ArrowRight } from 'lucide-react';

const products = [
    { id: 1, name: 'Wireless Headphones', price: 79.99, rating: 4.5, category: 'Electronics', gradient: '#e0e0e0' },
    { id: 2, name: 'Smart Watch Pro', price: 199.99, rating: 4.8, category: 'Electronics', gradient: '#d5d5d5' },
    { id: 3, name: 'Running Sneakers', price: 129.99, rating: 4.3, category: 'Fashion', gradient: '#e8e8e8' },
    { id: 4, name: 'Leather Backpack', price: 89.99, rating: 4.6, category: 'Accessories', gradient: '#dcdcdc' },
    { id: 5, name: 'Sunglasses Ultra', price: 59.99, rating: 4.1, category: 'Fashion', gradient: '#e3e3e3' },
    { id: 6, name: 'Bluetooth Speaker', price: 49.99, rating: 4.7, category: 'Electronics', gradient: '#dadada' },
    { id: 7, name: 'Yoga Mat Premium', price: 34.99, rating: 4.4, category: 'Sports', gradient: '#ebebeb' },
    { id: 8, name: 'Coffee Maker Deluxe', price: 149.99, rating: 4.9, category: 'Home', gradient: '#e5e5e5' },
];

function StarRating({ rating }) {
    return (
        <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    size={14}
                    className={star <= Math.round(rating) ? 'star-filled' : 'star-empty'}
                />
            ))}
            <span className="rating-text">{rating}</span>
        </div>
    );
}

function ProductCard({ product, onAddToCart, onToggleFav, isFav }) {
    return (
        <div className="product-card">
            <div className="product-image" style={{ background: product.gradient }}>
                <span className="product-category">{product.category}</span>
                <button
                    className={`fav-btn ${isFav ? 'fav-active' : ''}`}
                    onClick={() => onToggleFav(product.id)}
                >
                    <Heart size={18} />
                </button>
                <Package className="product-icon" size={48} />
            </div>
            <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <StarRating rating={product.rating} />
                <div className="product-bottom">
                    <span className="product-price">${product.price.toFixed(2)}</span>
                    <button className="add-to-cart-btn" onClick={() => onAddToCart(product)}>
                        <ShoppingCart size={16} />
                        <span>Add</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function App() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);
    const [favorites, setFavorites] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const handleAddToCart = () => {
        setCartCount((prev) => prev + 1);
    };

    const toggleFavorite = (id) => {
        setFavorites((prev) =>
            prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
        );
    };

    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="app">
            {/* Navigation */}
            <nav className="navbar">
                <div className="container nav-container">
                    <div className="logo">
                        <Package className="logo-icon" size={28} />
                        <span>ShopVibe</span>
                    </div>

                    <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                        <a href="#home" onClick={() => setIsMenuOpen(false)}>Home</a>
                        <a href="#shop" onClick={() => setIsMenuOpen(false)}>Shop</a>
                        <a href="#about" onClick={() => setIsMenuOpen(false)}>About</a>
                        <a href="#contact" onClick={() => setIsMenuOpen(false)}>Contact</a>
                    </div>

                    <div className="nav-actions">
                        <div className="search-wrapper">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <button className="cart-btn">
                            <ShoppingCart size={22} />
                            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                        </button>
                    </div>

                    <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </nav>

            {/* Hero */}
            <header id="home" className="hero">
                <div className="hero-bg-shapes">
                    <div className="shape shape-1"></div>
                    <div className="shape shape-2"></div>
                    <div className="shape shape-3"></div>
                </div>
                <div className="container hero-content">
                    <span className="hero-badge">🔥 New Collection 2026</span>
                    <h1>Discover Premium <br /><span className="text-gradient">Products</span></h1>
                    <p>Shop the latest trends with exclusive deals. Fast delivery, easy returns, and unmatched quality.</p>
                    <div className="hero-buttons">
                        <a href="#shop" className="primary-btn">
                            Shop Now <ArrowRight size={18} />
                        </a>
                        <button className="secondary-btn">View Deals</button>
                    </div>
                </div>
            </header>

            {/* Products */}
            <section id="shop" className="section products-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Featured Products</h2>
                        <p>Carefully curated picks just for you</p>
                    </div>
                    <div className="products-grid">
                        {filteredProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onAddToCart={handleAddToCart}
                                onToggleFav={toggleFavorite}
                                isFav={favorites.includes(product.id)}
                            />
                        ))}
                        {filteredProducts.length === 0 && (
                            <div className="no-results">
                                <p>No products found for "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="container footer-content">
                    <div className="footer-brand">
                        <Package size={24} />
                        <span>ShopVibe</span>
                    </div>
                    <p>&copy; 2026 ShopVibe. All rights reserved.</p>
                    <div className="footer-links">
                        <a href="#">Privacy</a>
                        <a href="#">Terms</a>
                        <a href="#">Support</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;
