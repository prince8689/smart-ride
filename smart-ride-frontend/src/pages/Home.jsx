import React, { useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CheckCircle2, MapPin, CreditCard, Car, Calendar, Shield, PhoneCall, Send, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { submitQuery } from '../api/settings.api';
import useCountAnimation from '../hooks/useCountAnimation';

const AnimatedStat = ({ target, suffix = '', float = false }) => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -50px 0px" });
  const count = useCountAnimation(isInView ? target : 0, 1500);
  return (
    <span ref={ref} className="text-white text-xl font-bold">
      {float ? (count / 10).toFixed(1) : count}{suffix}
    </span>
  );
};

const Home = () => {
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error('Please fill required fields (Name, Email, Message)');
      return;
    }
    setLoading(true);
    try {
      await submitQuery(contactForm);
      toast.success('Your query has been submitted. We will get back to you soon!');
      setContactForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      toast.error('Failed to submit query. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-navy-50">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 bg-navy-900 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpIi8+PC9zdmc+')] opacity-20"></div>
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], x: [0, 50, 0], y: [0, -50, 0] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -right-[10%] w-[60%] h-[80%] bg-primary-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-30"
          ></motion.div>
          <motion.div
            animate={{ scale: [1, 1.5, 1], rotate: [0, -90, 0], x: [0, -50, 0], y: [0, 50, 0] }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[70%] bg-blue-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-20"
          ></motion.div>
        </div>

        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
            <div className="w-full lg:w-3/5 text-center lg:text-left">
              <Badge color="primary" className="mb-6 px-4 py-1.5 text-sm uppercase tracking-wider font-semibold">
                🚗 Subscription-Based Daily Commute
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Your Ride. <br className="hidden md:block"/>
                <span className="text-primary-400">Every Day.</span> <br className="hidden md:block"/>
                Same Driver.
              </h1>
              
              <p className="text-lg md:text-xl text-navy-200 mb-10 max-w-2xl mx-auto lg:mx-0">
                Stop booking cabs daily. Subscribe to Smart Ride and get the same trusted driver at your door every morning. Predictable pricing, zero daily hassle.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto px-8">
                    Start Your Commute
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 bg-transparent text-white border-white hover:bg-white hover:text-navy-900">
                    How It Works
                  </Button>
                </a>
              </div>

              <div className="flex flex-wrap justify-center lg:justify-start items-center gap-6 text-sm text-navy-300 font-medium">
                <div className="flex items-center gap-2"><AnimatedStat target={500} suffix="+" /> Commuters</div>
                <div className="w-1.5 h-1.5 rounded-full bg-navy-600"></div>
                <div className="flex items-center gap-2"><AnimatedStat target={50} suffix="+" /> Drivers</div>
                <div className="w-1.5 h-1.5 rounded-full bg-navy-600"></div>
                <div className="flex items-center gap-2"><AnimatedStat target={10} suffix="+" /> Cities</div>
                <div className="w-1.5 h-1.5 rounded-full bg-navy-600"></div>
                <div className="flex items-center gap-2 text-yellow-400"><span className="text-yellow-400 text-xl font-bold"><AnimatedStat target={48} float={true} suffix="★" /></span> Rating</div>
              </div>
            </div>

            <div className="hidden lg:flex w-full lg:w-2/5 justify-center">
              {/* Abstract App Mockup Illustration */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="w-72 h-[500px] bg-white rounded-[3rem] border-[8px] border-navy-800 shadow-2xl relative overflow-hidden flex flex-col"
              >
                <div className="absolute top-0 w-full h-6 bg-navy-800 flex justify-center">
                  <div className="w-24 h-4 bg-navy-900 rounded-b-xl"></div>
                </div>
                <div className="p-6 pt-10 flex-1 bg-navy-50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                      <Car size={20} />
                    </div>
                    <div>
                      <div className="text-xs text-navy-500 font-medium">Arriving in</div>
                      <div className="text-lg font-bold text-navy-900">5 mins</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm mb-4 border border-navy-100">
                    <div className="flex items-center gap-3 border-b border-navy-50 pb-3 mb-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="text-sm font-medium text-navy-900">Home</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <div className="text-sm font-medium text-navy-900">Office Tech Park</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-navy-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-navy-200 rounded-full flex items-center justify-center text-navy-600 font-bold">RJ</div>
                      <div>
                        <div className="text-sm font-bold text-navy-900">Rahul J.</div>
                        <div className="text-xs text-navy-500">Toyota Innova • 4.9★</div>
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <PhoneCall size={14} />
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 border-t border-navy-100 flex justify-between">
                  <div className="w-1/4 h-1 bg-primary-600 rounded-full"></div>
                  <div className="w-1/4 h-1 bg-navy-200 rounded-full"></div>
                  <div className="w-1/4 h-1 bg-navy-200 rounded-full"></div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 md:py-28 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-4">How Smart Ride Works</h2>
            <p className="text-lg text-navy-600">Four simple steps to transform your daily commute from a hassle into a breeze.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: <CheckCircle2 size={32} />, title: "Register & Choose", desc: "Sign up and select your desired pickup and drop locations from our available routes." },
              { icon: <MapPin size={32} />, title: "Set Your Route", desc: "Select your preferred morning and evening pickup timings." },
              { icon: <CreditCard size={32} />, title: "Subscribe & Pay", desc: "Choose a monthly or quarterly plan and pay securely via Razorpay." },
              { icon: <Car size={32} />, title: "Ride Daily", desc: "Your dedicated driver arrives on time, every day. Track them in real-time." },
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative bg-navy-50 rounded-2xl p-8 border border-navy-100 hover:border-primary-200 hover:shadow-lg transition-all group"
              >
                <div className="absolute -top-5 -left-5 w-10 h-10 bg-primary-600 text-white font-bold text-lg rounded-full flex items-center justify-center shadow-md">
                  {i + 1}
                </div>
                <div className="w-16 h-16 bg-white text-primary-600 rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">{step.title}</h3>
                <p className="text-navy-600 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DYNAMIC PRICING SECTION (REPLACED FIXED PRICING) */}
      <section className="py-20 md:py-28 bg-navy-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="w-full lg:w-1/2">
              <Badge color="green" className="mb-4">Fair & Transparent Pricing</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-6">Pay for the distance you actually travel.</h2>
              <p className="text-lg text-navy-600 mb-6">
                Unlike regular cabs with unpredictable surge pricing, Smart Ride offers dynamic subscription plans tailored specifically to your daily route's distance. 
              </p>
              <p className="text-lg text-navy-600 mb-8">
                Whether your office is 5km away or 25km away, you only pay what's fair. Enter your pickup and drop locations in the app to instantly calculate your customized monthly subscription fee.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-navy-100">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600"><IndianRupee size={24}/></div>
                  <div>
                    <p className="text-sm text-navy-500 font-medium">Starting from</p>
                    <p className="text-xl font-bold text-navy-900">₹99 <span className="text-sm font-normal text-navy-500">/ day</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-navy-100">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600"><Shield size={24}/></div>
                  <div>
                    <p className="text-sm text-navy-500 font-medium">Guarantee</p>
                    <p className="text-xl font-bold text-navy-900">No Surge</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-full lg:w-1/2">
              <div className="bg-white rounded-3xl p-8 border border-navy-100 shadow-xl relative">
                <div className="absolute top-0 right-10 -translate-y-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1 rounded-full shadow-md">
                  Example Route
                </div>
                <h3 className="text-2xl font-bold text-navy-900 mb-6">Calculate Your Commute</h3>
                
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-3 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-primary-600 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl bg-navy-50 border border-navy-100 shadow-sm">
                      <p className="text-sm text-navy-500 font-medium mb-1">Pickup (Home)</p>
                      <p className="font-bold text-navy-900">Andheri West</p>
                    </div>
                  </div>
                  
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-green-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl bg-navy-50 border border-navy-100 shadow-sm">
                      <p className="text-sm text-navy-500 font-medium mb-1">Drop (Office)</p>
                      <p className="font-bold text-navy-900">Bandra Kurla Complex</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-navy-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-navy-500 font-medium">Distance: ~8 km</p>
                    <p className="text-2xl font-bold text-navy-900">₹3,200 <span className="text-sm font-normal text-navy-500">/ month</span></p>
                  </div>
                  <Link to="/register">
                    <Button variant="primary">Get Exact Quote</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-20 md:py-28 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-navy-900 mb-4">Why Choose Smart Ride?</h2>
            <p className="text-lg text-navy-600">Built specifically for the Indian daily commuter.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: User, title: "Same Driver Daily", desc: "Build trust with a dedicated driver who knows your route and preferences." },
              { icon: Calendar, title: "Fixed Schedule", desc: "No more waiting for cab assignments. Your ride is guaranteed at your chosen time." },
              { icon: Shield, title: "Safe & Verified", desc: "All drivers undergo strict background checks and vehicle inspections." },
              { icon: MapPin, title: "Real-time Tracking", desc: "Know exactly when your driver will arrive with live GPS tracking." },
              { icon: CreditCard, title: "Easy Payments", desc: "Pay once a month. No daily cash hassles or fluctuating surge pricing." },
              { icon: PhoneCall, title: "24/7 Support", desc: "Dedicated support team available through app or phone for any issues." },
            ].map((feat, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6 bg-navy-50 rounded-2xl border border-navy-100">
                <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-6">
                  <feat.icon size={32} />
                </div>
                <h3 className="text-xl font-bold text-navy-900 mb-3">{feat.title}</h3>
                <p className="text-navy-600">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 md:py-28 bg-navy-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpIi8+PC9zdmc+')] opacity-10"></div>
        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by Commuters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Priya Sharma", role: "Software Engineer", quote: "Smart Ride completely changed my mornings. No more haggling or surge pricing. My driver Suresh is always 5 mins early!" },
              { name: "Amit Patel", role: "Bank Manager", quote: "The predictable pricing is a blessing. I know exactly what I'm spending every month, and the cars are always clean." },
              { name: "Neha Gupta", role: "Architect", quote: "I feel incredibly safe knowing I have the same verified driver every single day. The customer support is also fantastic." },
            ].map((t, i) => (
              <div key={i} className="bg-navy-800 p-8 rounded-2xl border border-navy-700">
                <div className="flex gap-1 text-yellow-400 mb-6">
                  {[1,2,3,4,5].map(star => <span key={star}>★</span>)}
                </div>
                <p className="text-navy-200 mb-8 italic">"{t.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center font-bold">{t.name.charAt(0)}</div>
                  <div>
                    <div className="font-bold">{t.name}</div>
                    <div className="text-navy-400 text-sm">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT QUERY SECTION */}
      <section className="py-20 md:py-28 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="bg-navy-50 rounded-3xl overflow-hidden border border-navy-100 shadow-xl flex flex-col md:flex-row">
            <div className="w-full md:w-5/12 bg-primary-600 p-10 text-white flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
                <p className="text-primary-100 mb-8">
                  Have a special requirement or a question about our subscription models? Let our support team assist you.
                </p>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center"><PhoneCall size={20} /></div>
                    <div>
                      <p className="text-sm text-primary-200">Call Us</p>
                      <p className="font-bold text-lg">24x7 Support Available</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center"><Send size={20} /></div>
                    <div>
                      <p className="text-sm text-primary-200">Email Us</p>
                      <p className="font-bold text-lg">Fast Response Guaranteed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-7/12 p-10">
              <h3 className="text-2xl font-bold text-navy-900 mb-6">Send a Query</h3>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-navy-700 mb-1">Name *</label>
                    <input 
                      type="text" 
                      required
                      value={contactForm.name}
                      onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-600"
                      placeholder="Your Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-navy-700 mb-1">Email *</label>
                    <input 
                      type="email" 
                      required
                      value={contactForm.email}
                      onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-600"
                      placeholder="Your Email"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-navy-700 mb-1">Phone</label>
                    <input 
                      type="tel" 
                      value={contactForm.phone}
                      onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-600"
                      placeholder="Phone Number (Optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-navy-700 mb-1">Subject</label>
                    <input 
                      type="text" 
                      value={contactForm.subject}
                      onChange={e => setContactForm(f => ({ ...f, subject: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-600"
                      placeholder="How can we help?"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy-700 mb-1">Message *</label>
                  <textarea 
                    rows="4"
                    required
                    value={contactForm.message}
                    onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-600 resize-none"
                    placeholder="Write your query here..."
                  ></textarea>
                </div>
                <Button type="submit" variant="primary" size="lg" fullWidth isLoading={loading} className="mt-2">
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-blue-500 text-white text-center px-4">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to simplify your commute?</h2>
        <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">Join thousands of others who have switched to subscription-based daily rides.</p>
        <Link to="/register">
          <Button size="lg" className="bg-white text-primary-600 hover:bg-gray-50 border-2 border-white px-10">
            Start Today
          </Button>
        </Link>
      </section>

      <Footer />
    </div>
  );
};

// Helper for User icon (reusing from Lucide if imported, else recreating minimal)
const User = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);

export default Home;
